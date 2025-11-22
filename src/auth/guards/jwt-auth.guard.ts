import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Auth Guard
 * Uses JwtStrategy for native JWT authentication
 * Use on protected endpoints that require native auth
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
