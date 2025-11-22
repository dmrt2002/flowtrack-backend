export interface UserPayload {
    authId: string;
    sessionId?: string;
}
export declare const User: (...dataOrPipes: (import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | keyof UserPayload | undefined)[]) => ParameterDecorator;
