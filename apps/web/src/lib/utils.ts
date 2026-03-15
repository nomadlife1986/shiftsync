import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format,
  startOfWeek,
  addDays,
  parseISO,
} from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(dateString: string): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return format(date, 'h:mm a');
}

export function formatDate(dateString: string): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return format(date, 'MMM d, yyyy');
}

export function formatDateShort(dateString: string): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return format(date, 'MMM d');
}

export function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function getWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
}

export function formatDayHeader(date: Date): string {
  return format(date, 'EEE, MMM d');
}

export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return format(d1, 'yyyy-MM-dd') === format(d2, 'yyyy-MM-dd');
}

export function getShiftDurationHours(start: string, end: string): number {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
}

export function getSkillColor(skill: string): string {
  const colors: Record<string, string> = {
    bartender: 'bg-purple-100 text-purple-800',
    line_cook: 'bg-orange-100 text-orange-800',
    server: 'bg-blue-100 text-blue-800',
    host: 'bg-green-100 text-green-800',
  };
  return colors[skill] || 'bg-gray-100 text-gray-800';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PUBLISHED: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700',
    PENDING_ACCEPTANCE: 'bg-yellow-100 text-yellow-700',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    OPEN: 'bg-blue-100 text-blue-700',
    PICKED_UP_PENDING: 'bg-amber-100 text-amber-700',
    EXPIRED: 'bg-gray-100 text-gray-500',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function formatSkillLabel(skill: string): string {
  return skill
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
