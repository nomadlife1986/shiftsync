import { ValueObject } from '../../common/value-object.base';
import { Result } from '../../common/result';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 6=Saturday

interface AvailabilityWindowProps {
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isRecurring: boolean;
  specificDate: string | null; // ISO date string (YYYY-MM-DD) for one-off overrides
  isAvailable: boolean; // false means "blocked" override
}

export class AvailabilityWindow extends ValueObject<AvailabilityWindowProps> {
  private static readonly TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
  private static readonly DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  private constructor(props: AvailabilityWindowProps) {
    super(props);
  }

  get dayOfWeek(): DayOfWeek {
    return this.props.dayOfWeek;
  }

  get startTime(): string {
    return this.props.startTime;
  }

  get endTime(): string {
    return this.props.endTime;
  }

  get isRecurring(): boolean {
    return this.props.isRecurring;
  }

  get specificDate(): string | null {
    return this.props.specificDate;
  }

  get isAvailable(): boolean {
    return this.props.isAvailable;
  }

  get startMinutes(): number {
    return AvailabilityWindow.timeToMinutes(this.props.startTime);
  }

  get endMinutes(): number {
    return AvailabilityWindow.timeToMinutes(this.props.endTime);
  }

  /**
   * Checks whether a given local hour and minute fall within this availability window.
   */
  coversTime(localDayOfWeek: DayOfWeek, localHour: number, localMinute: number): boolean {
    if (this.props.dayOfWeek !== localDayOfWeek) return false;

    const checkMinutes = localHour * 60 + localMinute;
    const startMin = this.startMinutes;
    const endMin = this.endMinutes;

    // Normal range (e.g., 09:00 - 17:00)
    if (startMin <= endMin) {
      return checkMinutes >= startMin && checkMinutes < endMin;
    }

    // Overnight range (e.g., 22:00 - 06:00) — only the portion on this day
    return checkMinutes >= startMin || checkMinutes < endMin;
  }

  /**
   * Checks if this window applies to a specific date string (YYYY-MM-DD).
   */
  appliesToDate(dateStr: string): boolean {
    if (this.props.isRecurring) return true;
    return this.props.specificDate === dateStr;
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  static create(params: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    specificDate?: string | null;
    isAvailable: boolean;
  }): Result<AvailabilityWindow, string> {
    if (params.dayOfWeek < 0 || params.dayOfWeek > 6 || !Number.isInteger(params.dayOfWeek)) {
      return Result.fail<AvailabilityWindow, string>(
        `Invalid dayOfWeek: ${params.dayOfWeek}. Must be 0 (Sunday) through 6 (Saturday).`,
      );
    }

    if (!AvailabilityWindow.TIME_REGEX.test(params.startTime)) {
      return Result.fail<AvailabilityWindow, string>(
        `Invalid startTime format: ${params.startTime}. Must be HH:mm.`,
      );
    }

    if (!AvailabilityWindow.TIME_REGEX.test(params.endTime)) {
      return Result.fail<AvailabilityWindow, string>(
        `Invalid endTime format: ${params.endTime}. Must be HH:mm.`,
      );
    }

    if (params.startTime === params.endTime) {
      return Result.fail<AvailabilityWindow, string>(
        'startTime and endTime cannot be the same.',
      );
    }

    if (!params.isRecurring && !params.specificDate) {
      return Result.fail<AvailabilityWindow, string>(
        'Non-recurring availability windows must have a specificDate.',
      );
    }

    if (params.specificDate && !AvailabilityWindow.DATE_REGEX.test(params.specificDate)) {
      return Result.fail<AvailabilityWindow, string>(
        `Invalid specificDate format: ${params.specificDate}. Must be YYYY-MM-DD.`,
      );
    }

    return Result.ok<AvailabilityWindow, string>(
      new AvailabilityWindow({
        dayOfWeek: params.dayOfWeek as DayOfWeek,
        startTime: params.startTime,
        endTime: params.endTime,
        isRecurring: params.isRecurring,
        specificDate: params.specificDate ?? null,
        isAvailable: params.isAvailable,
      }),
    );
  }
}
