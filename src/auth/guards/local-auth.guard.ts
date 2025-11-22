import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local Auth Guard
 * Uses LocalStrategy for email/password authentication
 * Use on login endpoint
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
