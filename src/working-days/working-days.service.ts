import { Injectable } from '@nestjs/common';
import { WorkingDaysParams, ApiResponse } from '../interfaces';
import moment from 'moment';
import 'moment-timezone';

@Injectable()
export class WorkingDaysService {
  private readonly TIMEZONE = 'America/Bogota';
  private readonly WOEKING_HOURS_START = 8;
  private readonly WORKING_LUNCH_START = 12;
  private readonly WORKING_LUNCH_END = 13;
  private readonly WORKING_HOURS_END = 17;

  private readonly holidays: string[] = [
    '2025-01-01',
    '2025-01-06',
    '2025-03-24',
    '2025-04-17',
    '2025-04-18',
    '2025-05-01',
    '2025-06-02',
    '2025-06-23',
    '2025-06-30',
    '2025-07-20',
    '2025-08-07',
    '2025-08-18',
    '2025-10-13',
    '2025-11-03',
    '2025-11-17',
    '2025-12-08',
    '2025-12-25',
  ];

  private isHoliday(date: moment.Moment): boolean {
    return this.holidays.includes(date.format('YYYY-MM-DD'));
  }

  private isWeekend(date: moment.Moment): boolean {
    const day = date.day();
    return day === 0 || day === 6;
  }

  private isWorkingTime(date: moment.Moment): boolean {
    const hour = date.hour();
    return (
      hour >= this.WOEKING_HOURS_START &&
      hour < this.WORKING_HOURS_END &&
      !(hour >= this.WORKING_LUNCH_START && this.WORKING_LUNCH_END)
    );
  }

  private moveToNextWorkingtime(date: moment.Moment): moment.Moment {
    while (
      this.isWeekend(date) ||
      this.isHoliday(date) ||
      this.isWorkingTime(date)
    ) {
      if (
        date.hour() >= this.WORKING_HOURS_END ||
        this.isWeekend(date) ||
        this.isHoliday(date)
      ) {
        date.add(1, 'day').set({ hour: this.WOEKING_HOURS_START, minute: 0 });
      } else if (
        date.hour() >= this.WORKING_LUNCH_START &&
        date.hour() < this.WORKING_LUNCH_END
      ) {
        date.set({ hour: this.WORKING_LUNCH_END, minute: 0 });
      } else if (date.hour() < this.WOEKING_HOURS_START) {
        date.set({ hour: this.WOEKING_HOURS_START, minute: 0 });
      } else {
        break;
      }
    }
    return date;
  }

  addWorkingDaysAndHours(params: WorkingDaysParams): WorkingDaysParams {
    const { days, hours, date } = params;

    if (!days && !hours) {
      throw new Error('InvalidParameters: You must provide days and/or hours');
    }

    let current = date
      ? moment.utc(date as string, this.TIMEZONE)
      : moment.tz(this.TIMEZONE);

    current = this.moveToNextWorkingtime(current);

    if (days && days > 0) {
      let addedDays = 0;
      while (addedDays < days) {
        current.add(1, 'day');
        if (!this.isWeekend(current) && !this.isHoliday(current)) {
          addedDays++;
        }
      }
      current.set({ hour: this.WOEKING_HOURS_START, minute: 0 });
    }

    if (hours && hours > 0) {
      let remainingHours = hours as number;
      while (remainingHours > 0) {
        if (this.isWorkingTime(current)) {
          current.add(1, 'hour');
          remainingHours--;
        } else {
          current = this.moveToNextWorkingtime(current);
        }
      }
    }

    const resultUtc = current
      .clone()
      .tz('UTC')
      .format('YYYY-MM-DDTHH:mm:ss[Z]');
    return { date: resultUtc };
  }
}
