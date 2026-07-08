import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

export type SmsSendResult = {
  sent: boolean;
  devLogged: boolean;
  reason?: 'missing_aws_region' | 'missing_origination_number' | 'sns_publish_failed';
};

@Injectable()
export class SmsService {
  private readonly log = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  buildVerificationMessage(code: string): string {
    return `Rent Your Ride phone verification code: ${code}`;
  }

  async sendVerificationSms(phoneNumber: string, code: string): Promise<SmsSendResult> {
    const message = this.buildVerificationMessage(code);
    const region = this.config.get<string>('AWS_REGION');
    const origination = this.config.get<string>('PHONENUMBER')?.trim();

    if (!region) {
      this.log.warn(`[sms-dev] To ${phoneNumber}: ${message}`);
      return { sent: false, devLogged: true, reason: 'missing_aws_region' };
    }
    if (!origination) {
      this.log.warn(`[sms-dev] To ${phoneNumber}: ${message}`);
      return { sent: false, devLogged: true, reason: 'missing_origination_number' };
    }

    const client = new SNSClient({ region });
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
      await client.send(
        new PublishCommand({
          ...base,
          MessageAttributes: {
            ...base.MessageAttributes,
            'AWS.MM.SMS.OriginationNumber': {
              DataType: 'String',
              StringValue: origination,
            },
          },
        }),
      );
      return { sent: true, devLogged: false };
    } catch (err) {
      this.log.warn(
        `SNS SMS with origination failed for ${phoneNumber}; retrying without origination number`,
        err instanceof Error ? err.message : err,
      );
    }

    try {
      await client.send(new PublishCommand(base));
      return { sent: true, devLogged: false };
    } catch (err) {
      this.log.error(`SNS SMS failed for ${phoneNumber}`, err instanceof Error ? err.stack : err);
      return { sent: false, devLogged: false, reason: 'sns_publish_failed' };
    }
  }
}
