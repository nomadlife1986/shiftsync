import { UserEntity, AvailabilityWindow } from '../entities/user.entity';

/**
 * Domain service for checking user availability.
 * Uses basic timezone offset calculation.
 * In production, date-fns-tz would be used in the infrastructure layer.
 */
export class UserAvailabilityDomainService {
  /**
   * Check if a user is available during a given time range.
   * Times are in UTC; availability windows are in the location's timezone.
   * For domain-level check, we do a simplified check matching day-of-week and time windows.
   */
  isAvailableAt(
    user: UserEntity,
    startUtc: Date,
    endUtc: Date,
    _locationTimezone: string,
  ): boolean {
    const availabilities = user.availabilities;
    if (availabilities.length === 0) return true; // No restrictions = always available

    // Check each hour of the shift to ensure coverage
    const startDay = startUtc.getUTCDay();
    const startHour = startUtc.getUTCHours();
    const startMinute = startUtc.getUTCMinutes();
    const endDay = endUtc.getUTCDay();
    const endHour = endUtc.getUTCHours();
    const endMinute = endUtc.getUTCMinutes();

    // For simplicity in domain layer, check start time against availability
    // Infrastructure layer will do proper timezone conversion
    const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
    const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    // Check for specific date blocks first
    const specificBlocks = availabilities.filter(
      (a) => !a.isRecurring && a.specificDate !== null,
    );
    for (const block of specificBlocks) {
      if (block.specificDate && this.isSameDay(block.specificDate, startUtc)) {
        if (!block.isAvailable) return false;
        if (this.timeOverlaps(startTimeStr, endTimeStr, block.startTime, block.endTime)) {
          return block.isAvailable;
        }
      }
    }

    // Check recurring availability
    const recurringForDay = availabilities.filter(
      (a) => a.isRecurring && a.dayOfWeek === startDay,
    );

    if (recurringForDay.length === 0) return true;

    // Check if any available window covers the shift
    const availableWindows = recurringForDay.filter((a) => a.isAvailable);
    if (availableWindows.length === 0) {
      // Only blocked windows exist for this day
      const blockedWindows = recurringForDay.filter((a) => !a.isAvailable);
      for (const blocked of blockedWindows) {
        if (this.timeOverlaps(startTimeStr, endTimeStr, blocked.startTime, blocked.endTime)) {
          return false;
        }
      }
      return true;
    }

    // At least one available window must cover the shift time
    return availableWindows.some((w) =>
      this.timeContains(w.startTime, w.endTime, startTimeStr, endTimeStr),
    );
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate()
    );
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  }

  private timeOverlaps(s1: string, e1: string, s2: string, e2: string): boolean {
    const start1 = this.timeToMinutes(s1);
    const end1 = this.timeToMinutes(e1);
    const start2 = this.timeToMinutes(s2);
    const end2 = this.timeToMinutes(e2);
    return start1 < end2 && start2 < end1;
  }

  private timeContains(
    windowStart: string,
    windowEnd: string,
    shiftStart: string,
    shiftEnd: string,
  ): boolean {
    const ws = this.timeToMinutes(windowStart);
    const we = this.timeToMinutes(windowEnd);
    const ss = this.timeToMinutes(shiftStart);
    const se = this.timeToMinutes(shiftEnd);
    return ws <= ss && se <= we;
  }
}
