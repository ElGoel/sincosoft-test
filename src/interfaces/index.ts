export interface WorkingDaysParams {
  days?: number;
  hours?: number;
  date?: string;
}

export interface WorkingDaysResponse {
  date: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
