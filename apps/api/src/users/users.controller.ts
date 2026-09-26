import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  forwardRef,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { mkdirSync } from 'fs';
import { uploadsSubdir } from '../common/uploads-path';
import { ReqUser } from '../common/req-user.decorator';
import { UsersService } from './users.service';
import { ConfigService } from '@nestjs/config';
import { PushTokenService } from '../notifications/push-token.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DiditService } from '../didit/didit.service';

export class PatchMeDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  aboutBio?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  addressCity?: string;

  @IsOptional()
  @IsString()
  addressProvince?: string;

  @IsOptional()
  @IsString()
  addressPostalCode?: string;

  @IsOptional()
  @IsString()
  addressCountry?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;
}

export class NotificationSettingsDto {
  @IsOptional()
  textNotif?: boolean;

  @IsOptional()
  emailNotif?: boolean;

  @IsOptional()
  pushNotif?: boolean;
}

export class PatchNotificationDto {
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  settings: NotificationSettingsDto;
}

export class DeleteAccountDto {
  @IsBoolean()
  confirm: boolean;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  googleIdToken?: string;

  @IsOptional()
  @IsString()
  appleIdentityToken?: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
    private readonly pushTokens: PushTokenService,
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => DiditService))
    private readonly didit: DiditService,
  ) {}

  @Get('me')
  async me(@ReqUser() user) {
    try {
      await this.didit.reconcileUserLicense(user.id);
    } catch {
      /* keep stored license status if Didit is unreachable */
    }
    const fresh = await this.users.requireById(user.id);
    return fresh.toPublicDto();
  }

  @Get('me/deletion-eligibility')
  async deletionEligibility(@ReqUser() user) {
    return this.users.getDeletionEligibility(user.id);
  }

  @Delete('me')
  async deleteMe(@ReqUser() user, @Body() body: DeleteAccountDto) {
    if (!body?.confirm) {
      throw new BadRequestException('Confirm account deletion to continue.');
    }
    return this.users.requestDeletion(user.id, {
      password: body.password,
      googleIdToken: body.googleIdToken,
      appleIdentityToken: body.appleIdentityToken,
    });
  }

  @Patch('me')
  async patchMe(@ReqUser() user, @Body() body: PatchMeDto) {
    return this.users.updateProfile(user.id, body);
  }

  @Patch('me/password')
  async patchPassword(@ReqUser() user, @Body() body: ChangePasswordDto) {
    return this.users.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  @Get('me/in-app-notifications')
  async inAppNotifications(@ReqUser() user) {
    return this.notifications.listInAppForUser(user.id);
  }

  @Get('me/notification-settings')
  async getNotif(@ReqUser() user) {
    const fresh = await this.users.requireById(user.id);
    const s = fresh.notificationSettings ?? {};
    // Unset defaults ON (legacy + onboarding). Explicit false opts out.
    return {
      textNotif: s.textNotif !== false,
      emailNotif: s.emailNotif !== false,
      pushNotif: s.pushNotif !== false,
    };
  }

  @Patch('me/notification-settings')
  async patchNotif(@ReqUser() user, @Body() body: PatchNotificationDto) {
    return this.users.updateNotificationSettings(user.id, body.settings ?? {});
  }

  @Post('me/push-token')
  async registerPushToken(
    @ReqUser() user,
    @Body() body: { token: string; platform?: string; deviceId?: string },
  ) {
    await this.pushTokens.register(
      user.id,
      body.token,
      body.platform ?? 'ios',
      body.deviceId,
    );
    if (body.token) {
      await this.users.updateNotificationSettings(user.id, { pushNotif: true });
    }
    return { ok: true };
  }

  @Post('me/push-token/remove')
  async removePushToken(@ReqUser() user, @Body() body: { token: string }) {
    await this.pushTokens.unregister(user.id, body.token);
    return { ok: true };
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = uploadsSubdir('avatars');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = file.originalname.includes('.')
            ? file.originalname.split('.').pop()
            : 'jpg';
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async avatar(@ReqUser() user, @UploadedFile() file: Express.Multer.File) {
    const base =
      this.config.get<string>('PUBLIC_BASE_URL') || `http://127.0.0.1:${Number(process.env.PORT) || 8080}`;
    const url = `${base.replace(/\/$/, '')}/v1/uploads/avatars/${file.filename}`;
    return this.users.setAvatarUrl(user.id, url);
  }
}
