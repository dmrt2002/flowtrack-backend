import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserPayload {
  authId: string;
  sessionId?: string;
}

export const User = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    return data ? user?.[data] : user;
  },
);
