import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ['projectId'] as const),
) {
  @ApiProperty({
    description: 'Whether the task is complete',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isComplete?: boolean;
}
