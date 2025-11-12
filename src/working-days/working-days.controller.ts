import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { WorkingDaysService } from './working-days.service';
import type {
  WorkingDaysParams,
  WorkingDaysResponse,
  ErrorResponse,
} from 'src/interfaces';

@Controller('working-days')
export class WorkingDaysController {
  constructor(private readonly workingDaysService: WorkingDaysService) {}

  @Get()
  getCalculatedDate(
    @Query() query: WorkingDaysParams,
  ): WorkingDaysResponse | ErrorResponse {
    try {
      return this.workingDaysService.addWorkingDaysAndHours(query);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException({
          error: 'InvalidParameters',
          message: error.message,
        });
      }
      return {
        error: 'Internal Server Error',
        message: 'An unknown error occurred.',
      };
    }
  }
}
