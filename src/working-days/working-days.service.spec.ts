import { WorkingDaysService } from './working-days.service';

jest.mock('axios');
import axios from 'axios';
(axios.get as jest.Mock).mockResolvedValue({
  data: ['2025-04-17', '2025-04-18'],
});

describe('WorkingDaysService', () => {
  let service: WorkingDaysService;

  beforeEach(async () => {
    service = new WorkingDaysService();
    await service.initHolidays();
  });

  it('adds 1 working hour from friday 5pm → monday 9am UTC', async () => {
    const baseDate = '2025-08-01T22:00:00Z';
    const result = await service.calculate({ hours: 1, date: baseDate });
    expect(result.date).toBe('2025-08-04T14:00:00Z');
  });

  it('adds 1 working day from sunday 6pm → monday 5pm UTC', async () => {
    const baseDate = '2025-08-03T23:00:00Z';
    const result = await service.calculate({ days: 1, date: baseDate });
    expect(result.date).toBe('2025-08-04T22:00:00Z');
  });

  it('adds 5 days + 4 hours skipping holidays (April 17,18)', async () => {
    const baseDate = '2025-04-10T15:00:00Z';
    const result = await service.calculate({
      days: 5,
      hours: 4,
      date: baseDate,
    });
    expect(result.date).toBe('2025-04-21T20:00:00Z');
  });
});
