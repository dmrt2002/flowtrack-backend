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
export declare const User: (...dataOrPipes: (import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | keyof UserPayload | undefined)[]) => ParameterDecorator;
