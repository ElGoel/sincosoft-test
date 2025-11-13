import {
  WorkingDaysParams,
  ApiResponse,
  HolidayResponse,
} from 'src/interfaces';
import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import axios from 'axios';

@Injectable()
export class WorkingDaysService {
  private readonly WORK_START = 8;
  private readonly WORK_LUNCH_START = 12;
  private readonly WORK_LUNCH_END = 13;
  private readonly WORK_END = 17;
  private readonly TIMEZONE = 'America/Bogota';
  private holidays: Set<string> = new Set();

  async initHolidays(): Promise<void> {
    try {
      const response = await axios.get<HolidayResponse | string[]>(
        'https://content.capta.co/Recruitment/WorkingDays.json',
      );

      let holidayList: string[] = [];

      if (Array.isArray(response.data)) {
        holidayList = response.data;
      } else if (
        response.data &&
        typeof response.data === 'object' &&
        'holidays' in response.data
      ) {
        holidayList = response.data.holidays || [];
      }

      holidayList.forEach((d: string) => this.holidays.add(d));
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new ServiceUnavailableException(
          `Unable to fetch holidays: ${error.message}`,
        );
      }
      throw new ServiceUnavailableException('Unable to fetch holidays');
    }
  }

  private isHoliday(date: DateTime): boolean {
    const isoDate = date.toISODate();
    return isoDate ? this.holidays.has(isoDate) : false;
  }

  private isWeekend(date: DateTime): boolean {
    return date.weekday === 6 || date.weekday === 7;
  }

  private isWorkingHour(date: DateTime): boolean {
    const h = date.hour;

    if (h < this.WORK_START) return false;

    if (h >= this.WORK_END) return false;

    if (h >= this.WORK_LUNCH_START && h < this.WORK_LUNCH_END) return false;

    return true;
  }

  private moveToNextWorkTime(date: DateTime): DateTime {
    let adjusted = date;
    while (this.isWeekend(adjusted) || this.isHoliday(adjusted)) {
      adjusted = adjusted
        .plus({ days: 1 })
        .set({ hour: this.WORK_START, minute: 0, second: 0 });
    }

    if (adjusted.hour >= this.WORK_END) {
      adjusted = adjusted
        .plus({ days: 1 })
        .set({ hour: this.WORK_START, minute: 0, second: 0 });
      return this.moveToNextWorkTime(adjusted);
    }

    if (adjusted.hour < this.WORK_START) {
      adjusted = adjusted.set({ hour: this.WORK_START, minute: 0, second: 0 });
    }

    if (
      adjusted.hour >= this.WORK_LUNCH_START &&
      adjusted.hour < this.WORK_LUNCH_END
    ) {
      adjusted = adjusted.set({
        hour: this.WORK_LUNCH_END,
        minute: 0,
        second: 0,
      });
    }

    return adjusted;
  }

  private addWorkingDays(
    date: DateTime,
    days: number,
    timeToPreserve: {
      hour: number;
      minute: number;
      second: number;
      millisecond: number;
    },
  ): DateTime {
    let current = date;
    let added = 0;

    while (added < days) {
      current = current.plus({ days: 1 });
      if (!this.isWeekend(current) && !this.isHoliday(current)) {
        added++;
      }
    }

    while (this.isWeekend(current) || this.isHoliday(current)) {
      current = current.plus({ days: 1 });
    }

    return current.set(timeToPreserve);
  }

  private addWorkingHours(date: DateTime, hours: number): DateTime {
    let current = date;
    let remainingHours = hours;

    while (remainingHours > 0) {
      if (!this.isWorkingHour(current)) {
        current = this.moveToNextWorkTime(current);
        continue;
      }

      if (current.hour < this.WORK_LUNCH_START) {
        const hoursUntilLunch =
          this.WORK_LUNCH_START - current.hour - current.minute / 60;

        if (remainingHours <= hoursUntilLunch) {
          return current.plus({ minutes: remainingHours * 60 });
        }

        remainingHours -= hoursUntilLunch;
        current = current.set({
          hour: this.WORK_LUNCH_END,
          minute: 0,
          second: 0,
        });
        continue;
      }

      const hoursUntilEndOfDay =
        this.WORK_END - current.hour - current.minute / 60;

      if (remainingHours <= hoursUntilEndOfDay) {
        return current.plus({ minutes: remainingHours * 60 });
      }

      remainingHours -= hoursUntilEndOfDay;
      current = current
        .plus({ days: 1 })
        .set({ hour: this.WORK_START, minute: 0, second: 0 });
      current = this.moveToNextWorkTime(current);
    }

    return current;
  }

  async calculate({
    days,
    hours,
    date,
  }: WorkingDaysParams): Promise<ApiResponse> {
    if (!days && !hours) {
      throw new BadRequestException({
        error: 'InvalidParameters',
        message: 'Debe proporcionar al menos uno: days o hours',
      });
    }

    await this.initHolidays();

    const base = date
      ? DateTime.fromISO(date, { zone: 'utc' }).setZone(this.TIMEZONE)
      : DateTime.now().setZone(this.TIMEZONE);

    const originalTime = {
      hour: base.hour,
      minute: 0,
      second: 0,
      millisecond: 0,
    };

    let calculateDate: DateTime;
    if (hours && !days) {
      calculateDate = this.moveToNextWorkTime(base);
      calculateDate = this.addWorkingHours(calculateDate, hours);
    } else if (days) {
      calculateDate = this.moveToNextWorkTime(base);
      calculateDate = this.addWorkingDays(calculateDate, days, originalTime);

      if (hours) {
        calculateDate = this.addWorkingHours(calculateDate, hours);
      }
    } else {
      calculateDate = base;
    }

    const result = calculateDate.toUTC().toISO({ suppressMilliseconds: true });
    if (!result) throw new BadRequestException('Invalid date result');

    return { date: result };
  }
}
