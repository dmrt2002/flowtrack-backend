import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    description: 'The name of the project',
    example: 'Website Redesign',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Project description',
    example: 'Redesigning the company website with modern UI',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The workspace ID this project belongs to',
    example: 'cm1x2y3z4a5b6c7d8e9f0g1h',
  })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;
}
