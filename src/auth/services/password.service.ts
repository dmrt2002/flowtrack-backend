import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  /**
   * Hash password using Argon2id
   * Configuration: memoryCost: 65536 KB (64 MB), timeCost: 3, parallelism: 4
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      // Invalid hash format or other error
      return false;
    }
  }
}
