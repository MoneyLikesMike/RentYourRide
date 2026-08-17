import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinpointClient, SendMessagesCommand } from '@aws-sdk/client-pinpoint';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { PinpointSubstitutions } from './template-variables.builder';

@Injectable()
export class PinpointService {
  private readonly log = new Logger(PinpointService.name);
  private readonly pinpoint: PinpointClient | null;
  private readonly sns: SNSClient | null;
  private readonly appId: string;
  private readonly senderAddress: string;
  private readonly region: string;
  readonly adminEmail: string;

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
      this.sns = new SNSClient({ region: this.region });
    } else {
      this.pinpoint = null;
      this.sns = null;
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

  private deliveryOk(
    to: string,
    result: Record<string, { DeliveryStatus?: string; StatusMessage?: string }> | undefined,
  ): boolean {
    const row = result?.[to];
    const status = row?.DeliveryStatus;
    if (status === 'SUCCESSFUL' || status === 'SUCCESS') return true;
    this.log.error(
      `Pinpoint delivery failed to=${to} status=${status ?? 'MISSING'} msg=${row?.StatusMessage ?? ''}`,
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
      const ok = this.deliveryOk(to, out.MessageResponse?.Result as never);
      if (ok) {
        this.log.log(`Pinpoint email sent to=${to} template=${templateName}`);
      }
      return ok;
    } catch (err) {
      this.log.error(
        `Pinpoint email failed to=${to} template=${templateName}`,
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
        out.MessageResponse?.Result as never,
      );
      if (ok) {
        this.log.log(`Admin email sent to=${this.adminEmail} subject=${subject}`);
      }
      return ok;
    } catch (err) {
      this.log.error('Admin email failed', err instanceof Error ? err.message : err);
      return false;
    }
  }

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    if (!phoneNumber?.trim()) return false;
    if (!this.sns) {
      this.log.warn(`[sms-dev] To ${phoneNumber}: ${message}`);
      return false;
    }

    const origination = this.config.get<string>('PHONENUMBER')?.trim();
    const base = {
      Message: message,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    };

    try {
      await this.sns.send(
        new PublishCommand(
          origination
            ? {
                ...base,
                MessageAttributes: {
                  ...base.MessageAttributes,
                  'AWS.MM.SMS.OriginationNumber': {
                    DataType: 'String',
                    StringValue: origination,
                  },
                },
              }
            : base,
        ),
      );
      return true;
    } catch (err) {
      if (origination) {
        try {
          await this.sns.send(new PublishCommand(base));
          return true;
        } catch (retryErr) {
          this.log.error(
            `SNS SMS failed for ${phoneNumber}`,
            retryErr instanceof Error ? retryErr.message : retryErr,
          );
          return false;
        }
      }
      this.log.error(
        `SNS SMS failed for ${phoneNumber}`,
        err instanceof Error ? err.message : err,
      );
      return false;
    }
  }
}
