import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ headers?: { authorization?: string } }>();
    if (!req.headers?.authorization) return true;
    return super.canActivate(context);
  }

  override handleRequest<TUser>(err: Error | null, user: TUser): TUser | null {
    if (err) return null;
    return user || null;
  }
}
