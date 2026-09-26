import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from '@aws-sdk/client-cloudwatch';
import { GetSMSAttributesCommand, SNSClient } from '@aws-sdk/client-sns';
import { DataSource } from 'typeorm';
import Stripe from 'stripe';
import { DIDIT_VERIFICATION_API } from '../didit/didit.constants';
import { PinpointService } from '../notifications/pinpoint.service';
import { isProdApi, peerHealthUrl, publicApiBaseUrl } from './ops-report.util';
import { OpsCheckResult, OpsHealthSnapshot } from './ops-health.types';

@Injectable()
export class OpsHealthService {
  private readonly log = new Logger(OpsHealthService.name);
  private readonly region: string;
  private readonly sns: SNSClient | null;
  private readonly cloudwatch: CloudWatchClient | null;
  private readonly stripe: Stripe | null;

  constructor(
    private readonly config: ConfigService,
    private readonly pinpoint: PinpointService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.region = this.config.get<string>('AWS_REGION') ?? 'us-east-2';
    this.sns = this.region ? new SNSClient({ region: this.region }) : null;
    this.cloudwatch = this.region
      ? new CloudWatchClient({ region: this.region })
      : null;
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    this.stripe = stripeKey ? new Stripe(stripeKey) : null;
  }

  async runChecks(): Promise<OpsHealthSnapshot> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkStripe(),
      this.checkDidit(),
      this.checkPinpoint(),
      this.checkSmsSpend(),
      this.checkPeerApi(),
    ]);

    const hasFail = checks.some((c) => c.status === 'fail');
    const hasWarn = checks.some((c) => c.status === 'warn');
    return {
      at: new Date().toISOString(),
      env: isProdApi(this.config) ? 'production' : 'development',
      publicBaseUrl: publicApiBaseUrl(this.config),
      checks,
      ok: !hasFail,
      hasWarn,
      hasFail,
    };
  }

  formatSnapshotEmail(snap: OpsHealthSnapshot, headline: string): string {
    const linesOut = [
      headline,
      '',
      `env: ${snap.env}`,
      `api: ${snap.publicBaseUrl}`,
      `checkedAt: ${snap.at}`,
      '',
      ...snap.checks.map(
        (c) => `[${c.status.toUpperCase()}] ${c.label}: ${c.detail}`,
      ),
    ];
    return linesOut.join('\n');
  }

  private async checkDatabase(): Promise<OpsCheckResult> {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        key: 'database',
        label: 'Database',
        status: 'ok',
        detail: 'SELECT 1 succeeded',
      };
    } catch (err) {
      return {
        key: 'database',
        label: 'Database',
        status: 'fail',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkStripe(): Promise<OpsCheckResult> {
    if (!this.stripe) {
      return {
        key: 'stripe',
        label: 'Stripe',
        status: 'fail',
        detail: 'STRIPE_SECRET_KEY is not configured',
      };
    }
    try {
      const balance = await this.stripe.balance.retrieve();
      const avail = (balance.available ?? [])
        .map((b) => `${(b.amount / 100).toFixed(2)} ${b.currency}`)
        .join(', ');
      return {
        key: 'stripe',
        label: 'Stripe',
        status: 'ok',
        detail: `reachable (available: ${avail || 'n/a'})`,
      };
    } catch (err) {
      return {
        key: 'stripe',
        label: 'Stripe',
        status: 'fail',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkDidit(): Promise<OpsCheckResult> {
    const apiKey = this.config.get<string>('DIDIT_API_KEY')?.trim();
    if (!apiKey) {
      return {
        key: 'didit',
        label: 'Didit',
        status: 'fail',
        detail: 'DIDIT_API_KEY is not configured',
      };
    }
    try {
      const url = new URL(`${DIDIT_VERIFICATION_API}/v3/sessions/`);
      url.searchParams.set('limit', '1');
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return {
          key: 'didit',
          label: 'Didit',
          status: 'fail',
          detail: `HTTP ${res.status} ${body.slice(0, 200)}`,
        };
      }
      return {
        key: 'didit',
        label: 'Didit',
        status: 'ok',
        detail: 'sessions API reachable',
      };
    } catch (err) {
      return {
        key: 'didit',
        label: 'Didit',
        status: 'fail',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkPinpoint(): Promise<OpsCheckResult> {
    if (!this.pinpoint.isEmailConfigured()) {
      return {
        key: 'pinpoint',
        label: 'Pinpoint email',
        status: 'fail',
        detail: 'Pinpoint is not configured (AWS_PINPOINT_APP_ID missing)',
      };
    }
    const recentFails = this.pinpoint.recentEmailFailureCount(15 * 60 * 1000);
    if (recentFails >= 3) {
      return {
        key: 'pinpoint',
        label: 'Pinpoint email',
        status: 'fail',
        detail: `${recentFails} email delivery failures in the last 15 minutes`,
      };
    }
    if (recentFails > 0) {
      return {
        key: 'pinpoint',
        label: 'Pinpoint email',
        status: 'warn',
        detail: `${recentFails} email delivery failure(s) in the last 15 minutes`,
      };
    }
    return {
      key: 'pinpoint',
      label: 'Pinpoint email',
      status: 'ok',
      detail: `configured (admin → ${this.pinpoint.adminEmail})`,
    };
  }

  private async checkSmsSpend(): Promise<OpsCheckResult> {
    if (!this.cloudwatch) {
      return {
        key: 'sms_spend',
        label: 'SMS spend',
        status: 'skip',
        detail: 'CloudWatch client unavailable',
      };
    }
    try {
      let limit = Number(
        this.config.get<string>('OPS_SMS_MONTHLY_SPEND_LIMIT') ?? '',
      );
      if (!Number.isFinite(limit) || limit <= 0) {
        limit = isProdApi(this.config) ? 20 : 1;
      }

      if (this.sns) {
        try {
          const attrs = await this.sns.send(
            new GetSMSAttributesCommand({
              attributes: ['MonthlySpendLimit'],
            }),
          );
          const limitRaw = attrs.attributes?.MonthlySpendLimit;
          if (limitRaw != null && Number.isFinite(Number(limitRaw))) {
            limit = Number(limitRaw);
          }
        } catch (err) {
          this.log.warn(
            `SNS GetSMSAttributes failed; using configured limit $${limit}`,
            err instanceof Error ? err.message : err,
          );
        }
      }

      const end = new Date();
      const start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
      const metric = await this.cloudwatch.send(
        new GetMetricStatisticsCommand({
          Namespace: 'AWS/SNS',
          MetricName: 'SMSMonthToDateSpentUSD',
          StartTime: start,
          EndTime: end,
          Period: 3600,
          Statistics: ['Maximum'],
        }),
      );
      const points = [...(metric.Datapoints ?? [])].sort(
        (a, b) => (b.Timestamp?.getTime() ?? 0) - (a.Timestamp?.getTime() ?? 0),
      );
      const spent = points[0]?.Maximum ?? 0;

      if (!Number.isFinite(limit) || limit <= 0) {
        return {
          key: 'sms_spend',
          label: 'SMS spend',
          status: 'warn',
          detail: `MTD $${spent.toFixed(2)} (no MonthlySpendLimit set)`,
        };
      }

      const pct = (spent / limit) * 100;
      const detail = `MTD $${spent.toFixed(2)} / $${limit.toFixed(2)} (${pct.toFixed(0)}%)`;
      if (spent >= limit || pct >= 95) {
        return {
          key: 'sms_spend',
          label: 'SMS spend',
          status: 'fail',
          detail: `${detail} — at or near spend cap (OTP SMS will fail)`,
        };
      }
      if (pct >= 80) {
        return {
          key: 'sms_spend',
          label: 'SMS spend',
          status: 'warn',
          detail: `${detail} — approaching spend cap`,
        };
      }
      return {
        key: 'sms_spend',
        label: 'SMS spend',
        status: 'ok',
        detail,
      };
    } catch (err) {
      this.log.warn(
        'SMS spend check failed',
        err instanceof Error ? err.message : err,
      );
      return {
        key: 'sms_spend',
        label: 'SMS spend',
        status: 'warn',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkPeerApi(): Promise<OpsCheckResult> {
    const url = peerHealthUrl(this.config);
    return this.fetchHealth(url, 'peer_api', `Peer API (${url})`);
  }

  private async fetchHealth(
    url: string,
    key: string,
    label: string,
  ): Promise<OpsCheckResult> {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch(url, {
        method: 'GET',
        signal: ctrl.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timer);
      if (!res.ok) {
        return {
          key,
          label,
          status: 'fail',
          detail: `HTTP ${res.status}`,
        };
      }
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (body.ok === false) {
        return {
          key,
          label,
          status: 'fail',
          detail: 'health returned ok:false',
        };
      }
      return {
        key,
        label,
        status: 'ok',
        detail: 'reachable',
      };
    } catch (err) {
      return {
        key,
        label,
        status: 'fail',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
