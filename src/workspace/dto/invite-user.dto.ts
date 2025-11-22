import { IsEmail, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteUserDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    example: 'MEMBER',
    enum: ['ADMIN', 'MEMBER', 'BILLING'],
  })
  @IsString()
  @IsIn(['ADMIN', 'MEMBER', 'BILLING'])
  role: string;
}
