export interface StaffHoursEntry {
  userId: string;
  firstName: string;
  lastName: string;
  totalHours: number;
  desiredHours: number | null;
  premiumShiftCount: number;
  regularShiftCount: number;
  delta: number;
}

export interface FairnessReport {
  staffHours: StaffHoursEntry[];
  fairnessScore: number;
  premiumDistributionScore: number;
  averageHoursPerStaff: number;
  standardDeviation: number;
}

export interface AssignmentData {
  userId: string;
  startTime: Date;
  endTime: Date;
  isPremium: boolean;
}

export interface StaffData {
  userId: string;
  firstName: string;
  lastName: string;
  desiredHours: number | null;
}

export class FairnessCalculatorService {
  calculate(params: {
    staffList: StaffData[];
    assignments: AssignmentData[];
  }): FairnessReport {
    const { staffList, assignments } = params;
    const staffHours: StaffHoursEntry[] = staffList.map((staff) => {
      const userAssignments = assignments.filter((a) => a.userId === staff.userId);
      const totalHours = userAssignments.reduce((sum, a) => {
        return sum + (a.endTime.getTime() - a.startTime.getTime()) / (1000 * 60 * 60);
      }, 0);
      const premiumShiftCount = userAssignments.filter((a) => a.isPremium).length;
      const regularShiftCount = userAssignments.length - premiumShiftCount;

      return {
        userId: staff.userId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        totalHours: Math.round(totalHours * 10) / 10,
        desiredHours: staff.desiredHours,
        premiumShiftCount,
        regularShiftCount,
        delta: staff.desiredHours ? Math.round((totalHours - staff.desiredHours) * 10) / 10 : 0,
      };
    });

    const hours = staffHours.map((s) => s.totalHours);
    const averageHoursPerStaff = hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
    const standardDeviation = this.stdDev(hours);

    // Fairness score: 100 = perfectly fair, lower = less fair
    // Based on coefficient of variation (lower is more fair)
    const cv = averageHoursPerStaff > 0 ? standardDeviation / averageHoursPerStaff : 0;
    const fairnessScore = Math.round(Math.max(0, Math.min(100, 100 * (1 - cv))));

    // Premium distribution score
    const premiumCounts = staffHours.map((s) => s.premiumShiftCount);
    const premiumCv = this.mean(premiumCounts) > 0
      ? this.stdDev(premiumCounts) / this.mean(premiumCounts)
      : 0;
    const premiumDistributionScore = Math.round(Math.max(0, Math.min(100, 100 * (1 - premiumCv))));

    return {
      staffHours,
      fairnessScore,
      premiumDistributionScore,
      averageHoursPerStaff: Math.round(averageHoursPerStaff * 10) / 10,
      standardDeviation: Math.round(standardDeviation * 10) / 10,
    };
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private stdDev(values: number[]): number {
    if (values.length <= 1) return 0;
    const avg = this.mean(values);
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }
}
