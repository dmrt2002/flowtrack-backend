import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { ProjectModule } from '../project/project.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ProjectModule, AuthModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
