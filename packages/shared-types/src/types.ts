import type { ViolationType } from './enums';

// ─── Constraint Violation ─────────────────────────────────────────────────

export interface ConstraintViolation {
  type: ViolationType;
  message: string;
  details?: Record<string, unknown>;
}

// ─── Overtime ─────────────────────────────────────────────────────────────

export interface OvertimeWarning {
  type: 'WEEKLY_APPROACHING' | 'WEEKLY_EXCEEDED' | 'DAILY_EXCEEDED' | 'DAILY_BLOCKED' | 'CONSECUTIVE_DAYS_WARNING' | 'CONSECUTIVE_DAYS_BLOCKED';
  message: string;
  currentHours: number;
  threshold: number;
}

export interface OvertimeImpact {
  currentWeeklyHours: number;
  projectedWeeklyHours: number;
  overtimeHours: number;
  projectedCost: number;
  warnings: OvertimeWarning[];
}

export interface StaffSuggestion {
  userId: string;
  firstName: string;
  lastName: string;
  matchScore: number;
  warnings: string[];
}

// ─── Assignment Result ────────────────────────────────────────────────────

export interface AssignmentResult {
  success: boolean;
  assignmentId?: string;
  violations: ConstraintViolation[];
  warnings: OvertimeWarning[];
  suggestions: StaffSuggestion[];
}

// ─── What-If Result ───────────────────────────────────────────────────────

export interface WhatIfResult {
  canAssign: boolean;
  violations: ConstraintViolation[];
  overtimeImpact: OvertimeImpact;
  warnings: OvertimeWarning[];
}

// ─── Fairness ─────────────────────────────────────────────────────────────

export interface StaffHoursEntry {
  userId: string;
  firstName: string;
  lastName: string;
  totalHours: number;
  desiredHours: number | null;
  premiumShiftCount: number;
  regularShiftCount: number;
  delta: number; // actual - desired
}

export interface FairnessReport {
  period: { start: string; end: string };
  locationId?: string;
  staffHours: StaffHoursEntry[];
  fairnessScore: number; // 0-100, 100 = perfectly fair
  premiumDistributionScore: number;
  averageHoursPerStaff: number;
  standardDeviation: number;
}

// ─── On Duty ──────────────────────────────────────────────────────────────

export interface OnDutyEntry {
  userId: string;
  firstName: string;
  lastName: string;
  shiftId: string;
  locationId: string;
  locationName: string;
  skill: string;
  startTime: string;
  endTime: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────

export interface AuthPayload {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
