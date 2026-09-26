import { Controller, Get } from '@nestjs/common';
import { OpsHealthService } from './ops-health.service';

@Controller('ops')
export class OpsHealthController {
  constructor(private readonly health: OpsHealthService) {}

  /** Deep dependency check for staff / monitoring (not load-balancer probe). */
  @Get('health')
  async deepHealth() {
    const snap = await this.health.runChecks();
    return snap;
  }
}
