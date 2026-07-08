import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, Length, MinLength, IsEmail, IsOptional } from 'class-validator';
import { AuthService } from './auth.service';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class ForgotDto {
  @IsEmail()
  email: string;
}

export class ResetDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class StartPhoneVerificationDto {
  @IsString()
  phoneNumber: string;
}

export class FinishPhoneVerificationDto {
  @IsString()
  @Length(6, 6)
  code: string;
}

export class GoogleLoginDto {
  @IsString()
  idToken: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}

export class AppleLoginDto {
  @IsString()
  identityToken: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Post('google')
  @HttpCode(200)
  async googleLogin(@Body() body: GoogleLoginDto) {
    return this.auth.loginWithGoogle(body);
  }

  @Post('apple')
  @HttpCode(200)
  async appleLogin(@Body() body: AppleLoginDto) {
    return this.auth.loginWithApple(body);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('password/forgot')
  @HttpCode(200)
  async forgot(@Body() body: ForgotDto) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('password/reset')
  @HttpCode(200)
  async reset(@Body() body: ResetDto) {
    return this.auth.resetPassword(body.token, body.newPassword);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('start-phone-verification')
  async startPhoneVerification(@Req() req, @Body() body: StartPhoneVerificationDto) {
    return this.auth.startPhoneVerification(req.user.id, body.phoneNumber);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('finish-phone-verification')
  @HttpCode(200)
  async finishPhoneVerification(@Req() req, @Body() body: FinishPhoneVerificationDto) {
    return this.auth.finishPhoneVerification(req.user.id, body.code);
  }
}
