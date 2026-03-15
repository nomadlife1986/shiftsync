export interface OvertimeWarning {
  type: 'WEEKLY_APPROACHING' | 'WEEKLY_EXCEEDED' | 'DAILY_EXCEEDED' | 'DAILY_BLOCKED' | 'CONSECUTIVE_DAYS_WARNING' | 'CONSECUTIVE_DAYS_BLOCKED';
  message: string;
  currentHours: number;
  threshold: number;
}

export interface DailyBreakdown {
  date: string;
  hours: number;
  isOvertime: boolean;
}

export interface OvertimeResult {
  totalWeeklyHours: number;
  overtimeHours: number;
  projectedCost: number;
  warnings: OvertimeWarning[];
  blocks: OvertimeWarning[];
  dailyBreakdown: DailyBreakdown[];
  consecutiveDays: number;
}

export interface ShiftTime {
  shiftId: string;
  startTime: Date;
  endTime: Date;
}

export class OvertimeCalculatorService {
  private readonly WEEKLY_LIMIT = 40;
  private readonly WEEKLY_WARNING = 35;
  private readonly DAILY_WARNING = 8;
  private readonly DAILY_BLOCK = 12;
  private readonly CONSECUTIVE_WARNING = 6;
  private readonly CONSECUTIVE_BLOCK = 7;
  private readonly DEFAULT_HOURLY_RATE = 15;
  private readonly OVERTIME_MULTIPLIER = 1.5;

  calculate(params: {
    assignments: ShiftTime[];
    weekStart: Date;
    hourlyRate?: number;
  }): OvertimeResult {
    const { assignments, weekStart, hourlyRate = this.DEFAULT_HOURLY_RATE } = params;
    const warnings: OvertimeWarning[] = [];
    const blocks: OvertimeWarning[] = [];

    // Calculate daily breakdown
    const dailyBreakdown = this.getDailyBreakdown(assignments, weekStart);
    const totalWeeklyHours = dailyBreakdown.reduce((sum, d) => sum + d.hours, 0);
    const overtimeHours = Math.max(0, totalWeeklyHours - this.WEEKLY_LIMIT);
    const projectedCost = overtimeHours * hourlyRate * this.OVERTIME_MULTIPLIER;

    // Weekly checks
    if (totalWeeklyHours >= this.WEEKLY_WARNING && totalWeeklyHours < this.WEEKLY_LIMIT) {
      warnings.push({
        type: 'WEEKLY_APPROACHING',
        message: `Approaching weekly overtime: ${totalWeeklyHours.toFixed(1)} hours (limit: ${this.WEEKLY_LIMIT})`,
        currentHours: totalWeeklyHours,
        threshold: this.WEEKLY_LIMIT,
      });
    }
    if (totalWeeklyHours >= this.WEEKLY_LIMIT) {
      warnings.push({
        type: 'WEEKLY_EXCEEDED',
        message: `Weekly overtime: ${totalWeeklyHours.toFixed(1)} hours (${overtimeHours.toFixed(1)} OT hours)`,
        currentHours: totalWeeklyHours,
        threshold: this.WEEKLY_LIMIT,
      });
    }

    // Daily checks
    for (const day of dailyBreakdown) {
      if (day.hours > this.DAILY_BLOCK) {
        blocks.push({
          type: 'DAILY_BLOCKED',
          message: `${day.date}: ${day.hours.toFixed(1)} hours exceeds daily limit of ${this.DAILY_BLOCK}`,
          currentHours: day.hours,
          threshold: this.DAILY_BLOCK,
        });
      } else if (day.hours > this.DAILY_WARNING) {
        warnings.push({
          type: 'DAILY_EXCEEDED',
          message: `${day.date}: ${day.hours.toFixed(1)} hours exceeds ${this.DAILY_WARNING}-hour warning`,
          currentHours: day.hours,
          threshold: this.DAILY_WARNING,
        });
      }
    }

    // Consecutive days check
    const consecutiveDays = this.getConsecutiveDays(dailyBreakdown);
    if (consecutiveDays >= this.CONSECUTIVE_BLOCK) {
      blocks.push({
        type: 'CONSECUTIVE_DAYS_BLOCKED',
        message: `${consecutiveDays} consecutive days worked (7th day requires manager override)`,
        currentHours: consecutiveDays,
        threshold: this.CONSECUTIVE_BLOCK,
      });
    } else if (consecutiveDays >= this.CONSECUTIVE_WARNING) {
      warnings.push({
        type: 'CONSECUTIVE_DAYS_WARNING',
        message: `${consecutiveDays} consecutive days worked (warning at 6)`,
        currentHours: consecutiveDays,
        threshold: this.CONSECUTIVE_WARNING,
      });
    }

    return {
      totalWeeklyHours,
      overtimeHours,
      projectedCost,
      warnings,
      blocks,
      dailyBreakdown,
      consecutiveDays,
    };
  }

  checkDailyHours(date: Date, assignments: ShiftTime[]): { warnings: OvertimeWarning[]; blocks: OvertimeWarning[] } {
    const dayStr = date.toISOString().split('T')[0]!;
    let hours = 0;
    for (const a of assignments) {
      if (a.startTime.toISOString().split('T')[0] === dayStr) {
        hours += (a.endTime.getTime() - a.startTime.getTime()) / (1000 * 60 * 60);
      }
    }
    const warnings: OvertimeWarning[] = [];
    const blocks: OvertimeWarning[] = [];
    if (hours > this.DAILY_BLOCK) {
      blocks.push({ type: 'DAILY_BLOCKED', message: `${hours.toFixed(1)}h exceeds ${this.DAILY_BLOCK}h limit`, currentHours: hours, threshold: this.DAILY_BLOCK });
    } else if (hours > this.DAILY_WARNING) {
      warnings.push({ type: 'DAILY_EXCEEDED', message: `${hours.toFixed(1)}h exceeds ${this.DAILY_WARNING}h warning`, currentHours: hours, threshold: this.DAILY_WARNING });
    }
    return { warnings, blocks };
  }

  private getDailyBreakdown(assignments: ShiftTime[], weekStart: Date): DailyBreakdown[] {
    const days: DailyBreakdown[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setUTCDate(date.getUTCDate() + i);
      const dateStr = date.toISOString().split('T')[0]!;
      let hours = 0;
      for (const a of assignments) {
        const aDateStr = a.startTime.toISOString().split('T')[0];
        if (aDateStr === dateStr) {
          hours += (a.endTime.getTime() - a.startTime.getTime()) / (1000 * 60 * 60);
        }
      }
      days.push({ date: dateStr, hours, isOvertime: hours > this.DAILY_WARNING });
    }
    return days;
  }

  private getConsecutiveDays(breakdown: DailyBreakdown[]): number {
    let max = 0;
    let current = 0;
    for (const day of breakdown) {
      if (day.hours > 0) {
        current++;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    }
    return max;
  }
}
