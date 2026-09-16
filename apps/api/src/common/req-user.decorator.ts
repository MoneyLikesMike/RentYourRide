import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';

export const ReqUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as UserEntity;
  },
);
