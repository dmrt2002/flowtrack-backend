import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [WorkspaceModule, AuthModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
