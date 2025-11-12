export interface WorkingDaysParams {
  days?: number;
  hours?: number;
  date?: string;
}

export interface ApiResponse {
  date: string;
}

export interface HolidayResponse {
  holidays?: string[];
}
