import { Controller, Get, Query } from '@nestjs/common';
import { WorkingDaysService } from './working-days.service';

@Controller('working-days')
export class WorkingDaysController {
  constructor(private readonly service: WorkingDaysService) {}

  @Get()
  async getWorkingDate(
    @Query('days') days?: string,
    @Query('hours') hours?: string,
    @Query('date') date?: string,
  ) {
    const result = await this.service.calculate({
      days: days ? parseInt(days, 10) : undefined,
      hours: hours ? parseInt(hours, 10) : undefined,
      date,
    });

    return result;
  }
}
