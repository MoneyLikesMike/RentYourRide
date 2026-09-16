import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminGuard } from '../common/admin.guard';
import { TeamMemberEntity } from '../entities/team-member.entity';
import { AdminTeamController } from './admin-team.controller';
import { TeamPublicController } from './team-public.controller';
import { TeamService } from './team.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeamMemberEntity])],
  controllers: [TeamPublicController, AdminTeamController],
  providers: [TeamService, AdminGuard],
})
export class TeamModule {}
