import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PinpointSMSVoiceV2Client,
  SendTextMessageCommand,
} from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { SmsCopy } from '../notifications/sms-copy';

export type SmsSendResult = {
  sent: boolean;
  devLogged: boolean;
  reason?:
    | 'missing_aws_region'
    | 'missing_origination_number'
    | 'sns_publish_failed'
    | 'sns_spend_limit';
};

function isSnsSpendLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : '';
  return /spend.?limit|MonthlySpendLimit|AccountSpendLimitExceeded|ConflictException/i.test(
    `${name} ${message}`,
  );
}

@Injectable()
export class SmsService {
  private readonly log = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  buildVerificationMessage(code: string): string {
    return SmsCopy.phoneOtp(code);
  }

  async sendVerificationSms(phoneNumber: string, code: string): Promise<SmsSendResult> {
    const message = this.buildVerificationMessage(code);
    const region = this.config.get<string>('AWS_REGION');
    const origination = this.config.get<string>('PHONENUMBER')?.trim();
    const e164 = normalizeSmsDestination(phoneNumber);

    if (!region) {
      this.log.warn(`[sms-dev] To ${phoneNumber}: ${message}`);
      return { sent: false, devLogged: true, reason: 'missing_aws_region' };
    }
    if (!origination) {
      this.log.warn(`[sms-dev] To ${phoneNumber}: ${message}`);
      return { sent: false, devLogged: true, reason: 'missing_origination_number' };
    }
    if (!e164) {
      this.log.warn(`OTP SMS skipped — invalid phone "${phoneNumber}"`);
      return { sent: false, devLogged: false, reason: 'sns_publish_failed' };
    }

    // End User Messaging only — classic SNS is spend-capped and was abused for
    // expensive international destinations.
    return this.sendViaEndUserMessaging(region, origination, e164, message);
  }

  private async sendViaEndUserMessaging(
    region: string,
    origination: string,
    phoneNumber: string,
    message: string,
  ): Promise<SmsSendResult> {
    const client = new PinpointSMSVoiceV2Client({ region });
    const protectId = this.config.get<string>('SMS_PROTECT_CONFIGURATION_ID')?.trim();
    try {
      await client.send(
        new SendTextMessageCommand({
          DestinationPhoneNumber: phoneNumber,
          OriginationIdentity: origination,
          MessageBody: message,
          MessageType: 'TRANSACTIONAL',
          ...(protectId ? { ProtectConfigurationId: protectId } : {}),
        }),
      );
      return { sent: true, devLogged: false };
    } catch (err) {
      if (isSnsSpendLimitError(err)) {
        this.log.error(
          `End User Messaging SMS spend limit hit for ${phoneNumber}`,
          err instanceof Error ? err.message : err,
        );
        return { sent: false, devLogged: false, reason: 'sns_spend_limit' };
      }
      this.log.warn(
        `End User Messaging SMS failed for ${phoneNumber}`,
        err instanceof Error ? err.message : err,
      );
      return { sent: false, devLogged: false, reason: 'sns_publish_failed' };
    }
  }
}

function normalizeSmsDestination(phoneNumber: string | null | undefined): string | null {
  const trimmed = String(phoneNumber ?? '').trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}
