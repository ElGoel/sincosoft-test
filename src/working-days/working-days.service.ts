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
    const day = date.weekday; // 1=Monday, 7=Sunday
    return day === 6 || day === 7;
  }

  private isWorkingHour(date: DateTime): boolean {
    const hour = date.hour;
    return (
      hour >= this.WORK_START &&
      hour < this.WORK_END &&
      !(hour >= this.WORK_LUNCH_START && hour < this.WORK_LUNCH_END)
    );
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
    } else if (adjusted.hour < this.WORK_START) {
      adjusted = adjusted.set({ hour: this.WORK_START, minute: 0, second: 0 });
    } else if (
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

  private addWorkingDays(date: DateTime, days: number): DateTime {
    let current = date;
    let added = 0;

    while (added < days) {
      current = current.plus({ days: 1 });
      if (!this.isWeekend(current) && !this.isHoliday(current)) {
        added++;
      }
    }

    return current;
  }

  private addWorkingHours(date: DateTime, hours: number): DateTime {
    let current = date;

    while (hours > 0) {
      if (!this.isWorkingHour(current)) {
        current = this.moveToNextWorkTime(current);
        continue;
      }

      const endOfWork = current.set({
        hour: this.WORK_END,
        minute: 0,
        second: 0,
      });

      if (current.hour < this.WORK_LUNCH_START) {
        const untilLunch = this.WORK_LUNCH_START - current.hour;
        if (hours < untilLunch) {
          return current.plus({ hours });
        } else {
          current = current.plus({ hours: untilLunch });
          hours -= untilLunch;
          current = current.set({
            hour: this.WORK_LUNCH_END,
            minute: 0,
            second: 0,
          });
          continue;
        }
      }

      const remainingToday = endOfWork.diff(current, 'hours').hours;
      if (hours < remainingToday) {
        return current.plus({ hours });
      } else {
        hours -= remainingToday;
        current = current
          .plus({ days: 1 })
          .set({ hour: this.WORK_START, minute: 0, second: 0 });
        current = this.moveToNextWorkTime(current);
      }
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

    let base = date
      ? DateTime.fromISO(date, { zone: 'utc' }).setZone(this.TIMEZONE)
      : DateTime.now().setZone(this.TIMEZONE);

    base = this.moveToNextWorkTime(base);

    if (days) base = this.addWorkingDays(base, days);
    if (hours) base = this.addWorkingHours(base, hours);

    const result = base.setZone('utc').toISO({ suppressMilliseconds: true });

    if (!result) {
      throw new BadRequestException('Invalid date result');
    }

    return { date: result };
  }
}
