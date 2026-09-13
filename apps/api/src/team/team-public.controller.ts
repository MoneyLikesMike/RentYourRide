import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TeamService } from './team.service';

@ApiTags('team')
@Controller('team')
export class TeamPublicController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list() {
    return this.team.listPublished();
  }
}
