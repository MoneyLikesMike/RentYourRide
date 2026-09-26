import { Global, Module } from '@nestjs/common';
import { MailerliteService } from './mailerlite.service';

@Global()
@Module({
  providers: [MailerliteService],
  exports: [MailerliteService],
})
export class MailerliteModule {}
