export declare class PasswordService {
    hashPassword(password: string): Promise<string>;
    verifyPassword(hash: string, password: string): Promise<boolean>;
}
