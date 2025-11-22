import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    description: 'The title of the task',
    example: 'Design homepage mockup',
    minLength: 2,
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(300)
  title: string;

  @ApiProperty({
    description: 'Task description',
    example: 'Create wireframes and high-fidelity mockups for the new homepage',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The project ID this task belongs to',
    example: 'cm1x2y3z4a5b6c7d8e9f0g1h',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;
}
