import { z } from 'zod';

export const UserRole = z.enum(['ADMIN', 'MANAGER', 'STAFF']);
export type UserRole = z.infer<typeof UserRole>;

export const Skill = z.enum(['bartender', 'line_cook', 'server', 'host']);
export type Skill = z.infer<typeof Skill>;

export const ShiftStatus = z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED']);
export type ShiftStatus = z.infer<typeof ShiftStatus>;

export const AssignmentStatus = z.enum([
  'ASSIGNED',
  'SWAP_PENDING',
  'DROPPED',
  'COMPLETED',
  'CANCELLED',
]);
export type AssignmentStatus = z.infer<typeof AssignmentStatus>;

export const SwapStatus = z.enum([
  'PENDING_ACCEPTANCE',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
]);
export type SwapStatus = z.infer<typeof SwapStatus>;

export const DropStatus = z.enum([
  'OPEN',
  'PICKED_UP_PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
]);
export type DropStatus = z.infer<typeof DropStatus>;

export const NotificationType = z.enum([
  'SHIFT_ASSIGNED',
  'SHIFT_CHANGED',
  'SHIFT_CANCELLED',
  'SCHEDULE_PUBLISHED',
  'SWAP_REQUEST_RECEIVED',
  'SWAP_REQUEST_ACCEPTED',
  'SWAP_REQUEST_APPROVED',
  'SWAP_REQUEST_REJECTED',
  'SWAP_REQUEST_CANCELLED',
  'DROP_REQUEST_AVAILABLE',
  'DROP_REQUEST_PICKED_UP',
  'DROP_REQUEST_APPROVED',
  'DROP_REQUEST_EXPIRED',
  'OVERTIME_WARNING',
  'AVAILABILITY_CHANGED',
]);
export type NotificationType = z.infer<typeof NotificationType>;

export const ViolationType = z.enum([
  'DOUBLE_BOOKING',
  'INSUFFICIENT_REST',
  'SKILL_MISMATCH',
  'LOCATION_NOT_CERTIFIED',
  'UNAVAILABLE',
  'HEADCOUNT_EXCEEDED',
  'EDIT_CUTOFF_PASSED',
  'DAILY_HOURS_EXCEEDED',
  'WEEKLY_OVERTIME',
  'CONSECUTIVE_DAYS',
]);
export type ViolationType = z.infer<typeof ViolationType>;

export const DomainEventType = z.enum([
  // Shift events
  'ShiftCreated',
  'ShiftUpdated',
  'ShiftPublished',
  'ShiftUnpublished',
  'ShiftCancelled',
  'StaffAssigned',
  'StaffUnassigned',
  // Swap events
  'SwapRequested',
  'SwapAccepted',
  'SwapApproved',
  'SwapRejected',
  'SwapCancelled',
  'SwapExpired',
  // Drop events
  'DropRequested',
  'DropPickedUp',
  'DropApproved',
  'DropRejected',
  'DropCancelled',
  'DropExpired',
]);
export type DomainEventType = z.infer<typeof DomainEventType>;
