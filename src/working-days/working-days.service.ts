import { Injectable } from '@nestjs/common';
import { WorkingDaysParams } from '../interfaces';
import moment from 'moment';
import 'moment-timezone';
import { WorkingDaysResponse } from 'src/interfaces';

@Injectable()
export class WorkingDaysService {
  private readonly TIMEZONE = 'America/Bogota';
  private readonly WORKING_HOURS_START = 8;
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

  private isWorkingDay(date: moment.Moment): boolean {
    return !this.isWeekend(date) && !this.isHoliday(date);
  }

  private isWorkingTime(date: moment.Moment): boolean {
    if (!this.isWorkingDay(date)) return false;

    const hour = date.hour();

    if (hour < this.WORKING_HOURS_START) return false;
    if (hour >= this.WORKING_HOURS_END) return false;
    if (hour >= this.WORKING_LUNCH_START && hour < this.WORKING_LUNCH_END)
      return false;

    return true;
  }

  private moveToNextWorkingTime(date: moment.Moment): moment.Moment {
    while (!this.isWorkingDay(date)) {
      date
        .add(1, 'day')
        .set({ hour: this.WORKING_HOURS_START, minute: 0, second: 0 });
    }

    const hour = date.hour();

    if (hour < this.WORKING_HOURS_START) {
      date.set({ hour: this.WORKING_HOURS_START, minute: 0, second: 0 });
    } else if (
      hour >= this.WORKING_LUNCH_START &&
      hour < this.WORKING_LUNCH_END
    ) {
      date.set({ hour: this.WORKING_LUNCH_END, minute: 0, second: 0 });
    } else if (hour >= this.WORKING_HOURS_END) {
      date
        .add(1, 'day')
        .set({ hour: this.WORKING_HOURS_START, minute: 0, second: 0 });
      return this.moveToNextWorkingTime(date);
    }

    return date;
  }

  addWorkingDaysAndHours(params: WorkingDaysParams): WorkingDaysResponse {
    const { days, hours, date } = params;

    if (!days && !hours) {
      throw new Error('InvalidParameters: You must provide days and/or hours');
    }

    let current = date
      ? moment.tz(date as string, this.TIMEZONE)
      : moment.tz(this.TIMEZONE);

    const originalHour = current.hour();
    const originalMinute = current.minute();

    current = this.moveToNextWorkingTime(current.clone());

    if (days && days > 0) {
      let addedDays = 0;
      while (addedDays < days) {
        current.add(1, 'day');
        if (this.isWorkingDay(current)) {
          addedDays++;
        }
      }

      if (hours) {
        current.set({ hour: this.WORKING_HOURS_START, minute: 0, second: 0 });
      } else {
        let targetHour = originalHour;
        let targetMinute = originalMinute;

        if (originalHour < this.WORKING_HOURS_START) {
          targetHour = this.WORKING_HOURS_START;
          targetMinute = 0;
        } else if (originalHour >= this.WORKING_HOURS_END) {
          targetHour = this.WORKING_HOURS_END;
          targetMinute = 0;
        } else if (
          originalHour >= this.WORKING_LUNCH_START &&
          originalHour < this.WORKING_LUNCH_END
        ) {
          targetHour = this.WORKING_LUNCH_START;
          targetMinute = 0;
        }

        current.set({ hour: targetHour, minute: targetMinute, second: 0 });
      }
    }

    if (hours && hours > 0) {
      let remainingMinutes = hours * 60;

      while (remainingMinutes > 0) {
        if (!this.isWorkingTime(current)) {
          current = this.moveToNextWorkingTime(current);
          continue;
        }

        const currentHour = current.hour();
        const currentMinute = current.minute();

        let minutesUntilBreak;

        if (currentHour < this.WORKING_LUNCH_START) {
          minutesUntilBreak =
            (this.WORKING_LUNCH_START - currentHour) * 60 - currentMinute;
        } else if (
          currentHour >= this.WORKING_LUNCH_END &&
          currentHour < this.WORKING_HOURS_END
        ) {
          minutesUntilBreak =
            (this.WORKING_HOURS_END - currentHour) * 60 - currentMinute;
        } else {
          current = this.moveToNextWorkingTime(current);
          continue;
        }

        const minutesToAdd = Math.min(remainingMinutes, minutesUntilBreak);
        current.add(minutesToAdd, 'minutes');
        remainingMinutes -= minutesToAdd;

        if (remainingMinutes > 0 && !this.isWorkingTime(current)) {
          current = this.moveToNextWorkingTime(current);
        }
      }
    }

    const resultUtc = current.clone().utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
    return { date: resultUtc };
  }
}
