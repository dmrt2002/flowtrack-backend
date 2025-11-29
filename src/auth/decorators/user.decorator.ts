import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserPayload {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  authProvider: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  hasCompletedOnboarding: boolean | null;
  onboardingCompletedAt: Date | null;
}

export const User = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    return data ? user?.[data] : user;
  },
);
