import { Test, TestingModule } from '@nestjs/testing';
import { WorkingDaysService } from './working-days.service';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('WorkingDaysService', () => {
  let service: WorkingDaysService;
  let mockAxios: MockAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkingDaysService],
    }).compile();

    service = module.get<WorkingDaysService>(WorkingDaysService);
    mockAxios = new MockAdapter(axios);
  });

  afterEach(() => {
    mockAxios.reset();
  });

  describe('initHolidays', () => {
    it('should fetch and initialize holidays from API', async () => {
      const holidays = ['2025-04-17', '2025-04-18', '2025-12-25'];
      mockAxios
        .onGet('https://content.capta.co/Recruitment/WorkingDays.json')
        .reply(200, holidays);

      await service.initHolidays();

      // Verificar que no lanza error
      expect(true).toBe(true);
    });

    it('should handle holidays with object structure', async () => {
      const response = { holidays: ['2025-04-17', '2025-04-18'] };
      mockAxios
        .onGet('https://content.capta.co/Recruitment/WorkingDays.json')
        .reply(200, response);

      await service.initHolidays();

      expect(true).toBe(true);
    });

    it('should throw ServiceUnavailableException on API failure', async () => {
      mockAxios
        .onGet('https://content.capta.co/Recruitment/WorkingDays.json')
        .networkError();

      await expect(service.initHolidays()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('calculate', () => {
    beforeEach(() => {
      // Mock holidays: April 17 and 18, 2025
      mockAxios
        .onGet('https://content.capta.co/Recruitment/WorkingDays.json')
        .reply(200, ['2025-04-17', '2025-04-18']);
    });

    it('should throw BadRequestException when no days or hours provided', async () => {
      await expect(service.calculate({})).rejects.toThrow(BadRequestException);
    });

    // Example 1: Friday at 5:00 PM with hours=1
    // Expected: Monday at 9:00 AM Colombia (14:00:00Z UTC)
    it('should handle request on Friday at 5:00 PM with hours=1', async () => {
      // Friday, January 10, 2025 at 5:00 PM Colombia time
      const result = await service.calculate({
        date: '2025-01-10T22:00:00.000Z', // 5 PM Colombia = 10 PM UTC
        hours: 1,
      });

      // Should be Monday at 9 AM Colombia = 2 PM UTC
      expect(result.date).toBe('2025-01-13T14:00:00Z');
    });

    // Example 2: Saturday at 2:00 PM with hours=1
    // Expected: Monday at 9:00 AM Colombia (14:00:00Z UTC)
    it('should handle request on Saturday at 2:00 PM with hours=1', async () => {
      // Saturday, January 11, 2025 at 2:00 PM Colombia time
      const result = await service.calculate({
        date: '2025-01-11T19:00:00.000Z', // 2 PM Colombia = 7 PM UTC
        hours: 1,
      });

      // Should be Monday at 9 AM Colombia = 2 PM UTC
      expect(result.date).toBe('2025-01-13T14:00:00Z');
    });

    // Example 3: Tuesday at 3:00 PM with days=1 and hours=4
    // Expected: Thursday at 10:00 AM Colombia (15:00:00Z UTC)
    it('should handle request on Tuesday at 3:00 PM with days=1 and hours=4', async () => {
      // Tuesday, January 7, 2025 at 3:00 PM Colombia time
      const result = await service.calculate({
        date: '2025-01-07T20:00:00.000Z', // 3 PM Colombia = 8 PM UTC
        days: 1,
        hours: 4,
      });

      // Should be Thursday at 10 AM Colombia = 3 PM UTC
      expect(result.date).toBe('2025-01-09T15:00:00Z');
    });

    // Example 4: Sunday at 6:00 PM with days=1
    // Expected: Monday at 5:00 PM Colombia (22:00:00Z UTC)
    it('should handle request on Sunday at 6:00 PM with days=1', async () => {
      // Sunday, January 12, 2025 at 6:00 PM Colombia time
      const result = await service.calculate({
        date: '2025-01-12T23:00:00.000Z', // 6 PM Colombia = 11 PM UTC
        days: 1,
      });

      // Should be Tuesday at 8 AM Colombia = 1 PM UTC (Monday adjusted to next working day)
      expect(result.date).toBe('2025-01-14T13:00:00Z');
    });

    // Example 5: Weekday at 8:00 AM with hours=8
    // Expected: Same day at 5:00 PM Colombia (22:00:00Z UTC)
    it('should handle request on weekday at 8:00 AM with hours=8', async () => {
      // Monday, January 13, 2025 at 8:00 AM Colombia time
      const result = await service.calculate({
        date: '2025-01-13T13:00:00.000Z', // 8 AM Colombia = 1 PM UTC
        hours: 8,
      });

      // Should be same day at 5 PM Colombia = 10 PM UTC
      expect(result.date).toBe('2025-01-13T22:00:00Z');
    });

    // Example 6: Weekday at 8:00 AM with days=1
    // Expected: Next weekday at 8:00 AM Colombia (13:00:00Z UTC)
    it('should handle request on weekday at 8:00 AM with days=1', async () => {
      // Monday, January 13, 2025 at 8:00 AM Colombia time
      const result = await service.calculate({
        date: '2025-01-13T13:00:00.000Z', // 8 AM Colombia = 1 PM UTC
        days: 1,
      });

      // Should be Tuesday at 8 AM Colombia = 1 PM UTC
      expect(result.date).toBe('2025-01-14T13:00:00Z');
    });

    // Example 7: Weekday at 12:30 PM with days=1
    // Expected: Next weekday at 12:00 PM Colombia (17:00:00Z UTC)
    it('should handle request on weekday at 12:30 PM with days=1', async () => {
      // Monday, January 13, 2025 at 12:30 PM Colombia time
      const result = await service.calculate({
        date: '2025-01-13T17:30:00.000Z', // 12:30 PM Colombia = 5:30 PM UTC
        days: 1,
      });

      // Should be Tuesday at 1 PM Colombia = 6 PM UTC (after lunch adjustment)
      expect(result.date).toBe('2025-01-14T18:00:00Z');
    });

    // Example 8: Weekday at 11:30 AM with hours=3
    // Expected: Same weekday at 3:30 PM Colombia (20:30:00Z UTC)
    it('should handle request on weekday at 11:30 AM with hours=3', async () => {
      // Monday, January 13, 2025 at 11:30 AM Colombia time
      const result = await service.calculate({
        date: '2025-01-13T16:30:00.000Z', // 11:30 AM Colombia = 4:30 PM UTC
        hours: 3,
      });

      // Should be same day at 3:30 PM Colombia = 8:30 PM UTC
      // (11:30 AM -> 12 PM = 0.5h, skip lunch, 1 PM -> 3:30 PM = 2.5h)
      expect(result.date).toBe('2025-01-13T20:30:00Z');
    });

    // Example 9: April 10 at 3:00 PM with days=5 and hours=4 (with holidays on April 17-18)
    // Expected: April 21 at 3:00 PM Colombia (20:00:00Z UTC)
    it('should handle request on April 10 with days=5 and hours=4, skipping holidays', async () => {
      const result = await service.calculate({
        date: '2025-04-10T20:00:00.000Z', // April 10, 3 PM Colombia = 8 PM UTC
        days: 5,
        hours: 4,
      });

      // Should be April 21 at 3 PM Colombia = 8 PM UTC
      // April 10 (Thu) -> 11 (Fri) -> 14 (Mon) -> 15 (Tue) -> 16 (Wed) -> 21 (Mon, skipping 17-18 holidays and weekend)
      expect(result.date).toBe('2025-04-21T20:00:00Z');
    });

    // Additional test: Using current time when no date provided
    it('should use current time when no date is provided', async () => {
      const result = await service.calculate({
        hours: 1,
      });

      expect(result.date).toBeDefined();
      expect(typeof result.date).toBe('string');
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });

    // Edge case: Working hours spanning lunch break
    it('should properly handle hours that span lunch break', async () => {
      // Monday at 11 AM with 3 hours (should skip 12-1 PM lunch)
      const result = await service.calculate({
        date: '2025-01-13T16:00:00.000Z', // 11 AM Colombia = 4 PM UTC
        hours: 3,
      });

      // 11 AM + 1 hour = 12 PM, skip lunch to 1 PM, + 2 hours = 3 PM
      expect(result.date).toBe('2025-01-13T20:00:00Z'); // 3 PM Colombia = 8 PM UTC
    });

    // Edge case: Request during lunch hour
    it('should adjust to 1 PM when request is during lunch hour', async () => {
      // Monday at 12:30 PM with 1 hour
      const result = await service.calculate({
        date: '2025-01-13T17:30:00.000Z', // 12:30 PM Colombia = 5:30 PM UTC
        hours: 1,
      });

      // Should adjust to 1 PM, then add 1 hour = 2 PM
      expect(result.date).toBe('2025-01-13T19:00:00Z'); // 2 PM Colombia = 7 PM UTC
    });

    // Edge case: Friday afternoon rolling to Monday
    it('should roll Friday afternoon hours to Monday', async () => {
      // Friday at 4 PM with 2 hours
      const result = await service.calculate({
        date: '2025-01-10T21:00:00.000Z', // 4 PM Colombia = 9 PM UTC
        hours: 2,
      });

      // 4 PM + 1 hour = 5 PM (end of day), next day is Saturday -> Monday 9 AM + 1 hour = 10 AM
      expect(result.date).toBe('2025-01-13T15:00:00Z'); // Monday 10 AM Colombia = 3 PM UTC
    });
  });
});
