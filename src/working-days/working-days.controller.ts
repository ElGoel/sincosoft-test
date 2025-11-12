import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { WorkingDaysService } from './working-days.service';
import { validateUtc } from 'src/utils';

@Controller('working-days')
export class WorkingDaysController {
  constructor(private readonly service: WorkingDaysService) {}

  @Get()
  async getWorkingDate(
    @Query('days') days?: string,
    @Query('hours') hours?: string,
    @Query('date') date?: string,
  ) {
    if (date && !validateUtc(date)) {
      throw new BadRequestException({
        error: 'InvalidParameters',
        message: `${date} Is an invalid date format; it must be in UTC`,
        statusCode: 400,
      });
    }

    const result = await this.service.calculate({
      days: days ? parseInt(days, 10) : undefined,
      hours: hours ? parseInt(hours, 10) : undefined,
      date,
    });

    return result;
  }
}
