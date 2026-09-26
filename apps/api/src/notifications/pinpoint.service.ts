import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinpointClient, SendMessagesCommand } from '@aws-sdk/client-pinpoint';
import {
  PinpointSMSVoiceV2Client,
  SendTextMessageCommand,
} from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { PinpointSubstitutions } from './template-variables.builder';
import { classifySmsFailure, SmsFailureKind } from './host-cancel-notify';

export type SmsSendResult = {
  sent: boolean;
  failure?: SmsFailureKind;
  errorMessage?: string;
};

@Injectable()
export class PinpointService {
  private readonly log = new Logger(PinpointService.name);
  private readonly pinpoint: PinpointClient | null;
  private readonly smsClient: PinpointSMSVoiceV2Client | null;
  private readonly appId: string;
  private readonly senderAddress: string;
  private readonly region: string;
  readonly adminEmail: string;
  /** Recent email delivery failure timestamps (for ops health). */
  private readonly emailFailureAt: number[] = [];

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get<string>('AWS_REGION') ?? 'us-east-2';
    this.appId = this.config.get<string>('AWS_PINPOINT_APP_ID')?.trim() ?? '';
    const publicBase = (this.config.get<string>('PUBLIC_BASE_URL') ?? '').toLowerCase();
    const isProdApi = publicBase.includes('backend.rentyourride.ca');
    this.senderAddress =
      this.config.get<string>('AWS_PINPOINT_SENDER_ADDRESS')?.trim() ||
      (isProdApi ? 'donotreply@rentyourride.ca' : 'donotreply+dev@rentyourride.ca');
    // Legacy backends used the literal "none" to disable admin mail; treat it as unset.
    const configuredAdmin = this.config.get<string>('ADMIN_EMAIL')?.trim();
    this.adminEmail =
      configuredAdmin && configuredAdmin.toLowerCase() !== 'none'
        ? configuredAdmin
        : 'donotreply@rentyourride.ca';

    if (this.region) {
      this.pinpoint = new PinpointClient({ region: this.region });
      this.smsClient = new PinpointSMSVoiceV2Client({ region: this.region });
    } else {
      this.pinpoint = null;
      this.smsClient = null;
    }

    if (!this.appId) {
      this.log.warn(
        'AWS_PINPOINT_APP_ID is not set — emails will be logged instead of sent.',
      );
    }
  }

  isEmailConfigured(): boolean {
    return !!(this.pinpoint && this.appId);
  }

  recentEmailFailureCount(windowMs: number): number {
    const cutoff = Date.now() - windowMs;
    while (this.emailFailureAt.length && this.emailFailureAt[0]! < cutoff) {
      this.emailFailureAt.shift();
    }
    return this.emailFailureAt.length;
  }

  private recordEmailFailure(): void {
    this.emailFailureAt.push(Date.now());
    if (this.emailFailureAt.length > 100) {
      this.emailFailureAt.splice(0, this.emailFailureAt.length - 100);
    }
  }

  private deliveryOk(
    to: string,
    templateName: string,
    result: Record<string, { DeliveryStatus?: string; StatusMessage?: string }> | undefined,
  ): boolean {
    const row = result?.[to] ?? Object.values(result ?? {})[0];
    const status = row?.DeliveryStatus;
    if (status === 'SUCCESSFUL' || status === 'SUCCESS') return true;
    this.recordEmailFailure();
    this.log.error(
      `Pinpoint delivery failed to=${to} template=${templateName} status=${status ?? 'MISSING'} msg=${row?.StatusMessage ?? ''}`,
    );
    return false;
  }

  async sendTemplateEmail(
    to: string,
    templateName: string,
    substitutions: PinpointSubstitutions,
  ): Promise<boolean> {
    if (!this.pinpoint || !this.appId) {
      this.log.warn(`[email-dev] To ${to} template=${templateName}`);
      return false;
    }
    try {
      const out = await this.pinpoint.send(
        new SendMessagesCommand({
          ApplicationId: this.appId,
          MessageRequest: {
            Addresses: { [to]: { ChannelType: 'EMAIL' } },
            MessageConfiguration: {
              EmailMessage: {
                FromAddress: this.senderAddress,
                Substitutions: substitutions,
              },
            },
            TemplateConfiguration: {
              EmailTemplate: { Name: templateName, Version: 'latest' },
            },
          },
        }),
      );
      const ok = this.deliveryOk(
        to,
        templateName,
        out.MessageResponse?.Result as never,
      );
      if (ok) {
        this.log.log(`Pinpoint email sent to=${to} template=${templateName}`);
      }
      return ok;
    } catch (err) {
      this.recordEmailFailure();
      this.log.error(
        `Pinpoint email failed to=${to} template=${templateName}`,
        err instanceof Error ? err.message : err,
      );
      return false;
    }
  }

  async sendSimpleEmail(to: string, subject: string, body: string): Promise<boolean> {
    if (!to?.trim()) return false;
    if (!this.pinpoint || !this.appId) {
      this.log.warn(`[email-dev] To ${to} subject=${subject}\n${body}`);
      return false;
    }
    try {
      const out = await this.pinpoint.send(
        new SendMessagesCommand({
          ApplicationId: this.appId,
          MessageRequest: {
            Addresses: { [to]: { ChannelType: 'EMAIL' } },
            MessageConfiguration: {
              EmailMessage: {
                FromAddress: this.senderAddress,
                SimpleEmail: {
                  Subject: { Data: subject },
                  TextPart: { Data: body },
                },
              },
            },
          },
        }),
      );
      const ok = this.deliveryOk(
        to,
        `simple:${subject}`,
        out.MessageResponse?.Result as never,
      );
      if (ok) {
        this.log.log(`Pinpoint email sent to=${to} subject=${subject}`);
      }
      return ok;
    } catch (err) {
      this.recordEmailFailure();
      this.log.error(
        `Pinpoint email failed to=${to} subject=${subject}`,
        err instanceof Error ? err.message : err,
      );
      return false;
    }
  }

  async sendSimpleAdminEmail(subject: string, body: string): Promise<boolean> {
    if (!this.pinpoint || !this.appId || !this.adminEmail) {
      this.log.warn(`[admin-email-dev] ${subject}\n${body}`);
      return false;
    }
    try {
      const out = await this.pinpoint.send(
        new SendMessagesCommand({
          ApplicationId: this.appId,
          MessageRequest: {
            Addresses: { [this.adminEmail]: { ChannelType: 'EMAIL' } },
            MessageConfiguration: {
              EmailMessage: {
                FromAddress: this.senderAddress,
                SimpleEmail: {
                  Subject: { Data: subject },
                  TextPart: { Data: body },
                },
              },
            },
          },
        }),
      );
      const ok = this.deliveryOk(
        this.adminEmail,
        `admin:${subject}`,
        out.MessageResponse?.Result as never,
      );
      if (ok) {
        this.log.log(`Admin email sent to=${this.adminEmail} subject=${subject}`);
      }
      return ok;
    } catch (err) {
      this.recordEmailFailure();
      this.log.error('Admin email failed', err instanceof Error ? err.message : err);
      return false;
    }
  }

  /**
   * Transactional notification SMS via End User Messaging (same pipe as OTP).
   * Classic SNS is spend-capped and silently drops traffic after the cap.
   * Returns SmsSendResult so host-cancel retry / outbox can classify failures.
   */
  async sendSms(phoneNumber: string, message: string): Promise<SmsSendResult> {
    const e164 = toE164Phone(phoneNumber);
    if (!e164) {
      if (phoneNumber?.trim()) {
        this.log.warn(`SMS skipped — invalid phone "${phoneNumber}"`);
      }
      return {
        sent: false,
        failure: 'provider_error',
        errorMessage: 'invalid or missing phone',
      };
    }
    const origination = this.config.get<string>('PHONENUMBER')?.trim();
    if (!this.smsClient || !origination) {
      this.log.warn(`[sms-dev] To ${e164}: ${message}`);
      return {
        sent: false,
        failure: 'not_configured',
        errorMessage: 'sms-dev EUM client or origination missing',
      };
    }

    const protectId = this.config.get<string>('SMS_PROTECT_CONFIGURATION_ID')?.trim();
    try {
      await this.smsClient.send(
        new SendTextMessageCommand({
          DestinationPhoneNumber: e164,
          OriginationIdentity: origination,
          MessageBody: message,
          MessageType: 'TRANSACTIONAL',
          ...(protectId ? { ProtectConfigurationId: protectId } : {}),
        }),
      );
      this.log.log(`EUM SMS sent to=${e164}`);
      return { sent: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.log.error(`EUM SMS failed for ${e164}`, errorMessage);
      return {
        sent: false,
        failure: classifySmsFailure(errorMessage),
        errorMessage,
      };
    }
  }
}

/** Normalize stored phones (often missing "+") to E.164 for End User Messaging. */
function toE164Phone(phoneNumber: string | null | undefined): string | null {
  const trimmed = String(phoneNumber ?? '').trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  if (trimmed.startsWith('+')) return `+${digits}`;
  // Legacy rows sometimes store NANP as 10 digits or 11 with leading 1.
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}
