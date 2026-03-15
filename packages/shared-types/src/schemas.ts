import { z } from 'zod';
import { UserRole, Skill, ShiftStatus, SwapStatus, DropStatus, NotificationType } from './enums';

// ─── Auth ─────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// ─── User ─────────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: UserRole,
  phone: z.string().optional(),
  desiredWeeklyHours: z.number().int().min(0).max(60).optional(),
  skills: z.array(Skill).optional(),
  certifiedLocationIds: z.array(z.string()).optional(),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  desiredWeeklyHours: z.number().int().min(0).max(60).optional(),
  skills: z.array(Skill).optional(),
  certifiedLocationIds: z.array(z.string()).optional(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// ─── Availability ─────────────────────────────────────────────────────────

export const AvailabilityWindowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm format'),
  isRecurring: z.boolean().default(true),
  specificDate: z.string().datetime().optional(),
  isAvailable: z.boolean().default(true),
});
export type AvailabilityWindowInput = z.infer<typeof AvailabilityWindowSchema>;

export const SetAvailabilitySchema = z.object({
  windows: z.array(AvailabilityWindowSchema),
});
export type SetAvailabilityInput = z.infer<typeof SetAvailabilitySchema>;

// ─── Shift ────────────────────────────────────────────────────────────────

export const CreateShiftSchema = z.object({
  locationId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  requiredSkill: Skill,
  headcount: z.number().int().min(1),
  editCutoffHours: z.number().int().min(0).default(48),
});
export type CreateShiftInput = z.infer<typeof CreateShiftSchema>;

export const UpdateShiftSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  requiredSkill: Skill.optional(),
  headcount: z.number().int().min(1).optional(),
  editCutoffHours: z.number().int().min(0).optional(),
});
export type UpdateShiftInput = z.infer<typeof UpdateShiftSchema>;

// ─── Schedule ─────────────────────────────────────────────────────────────

export const PublishScheduleSchema = z.object({
  locationId: z.string(),
  week: z.string().datetime(), // Monday of the week
});
export type PublishScheduleInput = z.infer<typeof PublishScheduleSchema>;

// ─── Coverage ─────────────────────────────────────────────────────────────

export const RequestSwapSchema = z.object({
  shiftId: z.string(),
  targetId: z.string().optional(), // null = open for anyone
});
export type RequestSwapInput = z.infer<typeof RequestSwapSchema>;

export const RequestDropSchema = z.object({
  shiftId: z.string(),
});
export type RequestDropInput = z.infer<typeof RequestDropSchema>;

// ─── Notification Preferences ─────────────────────────────────────────────

export const NotificationPrefSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
});
export type NotificationPrefInput = z.infer<typeof NotificationPrefSchema>;

// ─── Filters ──────────────────────────────────────────────────────────────

export const DateRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});
export type DateRange = z.infer<typeof DateRangeSchema>;

export const EventFilterSchema = z.object({
  aggregateType: z.string().optional(),
  aggregateId: z.string().optional(),
  eventType: z.string().optional(),
  dateRange: DateRangeSchema.optional(),
  locationId: z.string().optional(),
});
export type EventFilter = z.infer<typeof EventFilterSchema>;
