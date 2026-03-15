'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { fromZonedTime } from 'date-fns-tz';
import {
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  X,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../../providers/auth-provider';
import { Header } from '../../../components/layout/header';
import { ErrorBanner } from '../../../components/ui/error-banner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../../../components/ui/dialog';
import {
  GET_WEEK_SCHEDULE,
  GET_LOCATIONS,
  GET_STAFF_BY_LOCATION,
} from '../../../lib/graphql/queries';
import {
  CREATE_SHIFT,
  UPDATE_SHIFT,
  DELETE_SHIFT,
  ASSIGN_STAFF,
  UNASSIGN_STAFF,
  PUBLISH_SHIFT,
  PUBLISH_SCHEDULE,
  UNPUBLISH_SCHEDULE,
} from '../../../lib/graphql/mutations';
import { formatAppError } from '../../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Skill =
  | 'BARTENDER'
  | 'LINE_COOK'
  | 'SERVER'
  | 'HOST'
  | 'BARBACK'
  | 'DISHWASHER';

const SKILLS: Skill[] = [
  'BARTENDER',
  'LINE_COOK',
  'SERVER',
  'HOST',
  'BARBACK',
  'DISHWASHER',
];

const SKILL_LABELS: Record<Skill, string> = {
  BARTENDER: 'Bartender',
  LINE_COOK: 'Line Cook',
  SERVER: 'Server',
  HOST: 'Host',
  BARBACK: 'Barback',
  DISHWASHER: 'Dishwasher',
};

interface Assignment {
  id: string;
  shiftId: string;
  userId: string;
  status: string;
  assignedBy: string;
  createdAt: string;
}

interface Shift {
  id: string;
  locationId: string;
  startTime: string;
  endTime: string;
  requiredSkill: Skill;
  headcount: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  scheduleWeek: string;
  publishedAt?: string;
  editCutoffHours: number;
  assignments: Assignment[];
  createdAt: string;
  updatedAt: string;
}

interface Location {
  id: string;
  name: string;
  address: string;
  timezone: string;
}

interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  skills: Skill[];
  desiredWeeklyHours: number;
}

interface Violation {
  type: string;
  message: string;
  severity?: 'error' | 'warning';
}

interface StaffSuggestion {
  userId: string;
  firstName: string;
  lastName: string;
  matchScore: number;
  warnings: string[];
}

interface AssignResult {
  success: boolean;
  assignmentId?: string;
  violations: Violation[];
  overtimeWarnings: Violation[];
  suggestions?: StaffSuggestion[];
}

// ---------------------------------------------------------------------------
// Shift form state
// ---------------------------------------------------------------------------

interface ShiftFormState {
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredSkill: Skill;
  headcount: number;
  editCutoffHours: number;
}

const defaultShiftForm = (locationId: string): ShiftFormState => ({
  locationId,
  date: toLocalDateStr(new Date()),
  startTime: '09:00',
  endTime: '17:00',
  requiredSkill: 'SERVER',
  headcount: 1,
  editCutoffHours: 48,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Returns YYYY-MM-DD in LOCAL time — toISOString() would give wrong date for UTC+ zones */
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
}

function getDayLabelInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date);
}

function getDayNumberInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    day: 'numeric',
  }).format(date);
}

function formatTimeInTimeZone(isoDate: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function buildShiftDateTime(date: string, time: string, timeZone: string): string {
  return fromZonedTime(`${date}T${time}:00`, timeZone).toISOString();
}

function shiftDateStr(shift: Shift): string {
  return toLocalDateStr(new Date(shift.startTime));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Renders a list of violations with per-item severity colouring. */
function ViolationList({
  violations,
  compact = false,
}: {
  violations: Violation[];
  compact?: boolean;
}) {
  if (!violations || violations.length === 0) return null;
  const errors = violations.filter((v) => v.severity === 'error' || !v.severity);
  const warnings = violations.filter((v) => v.severity === 'warning');
  return (
    <div className={`space-y-1.5 ${compact ? '' : 'mt-2'}`}>
      {errors.length > 0 && (
        <div className="rounded-md px-2.5 py-1.5 bg-red-50 border border-red-200">
          <div className="flex items-center gap-1 mb-0.5">
            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
            <span className="text-[10px] font-semibold text-red-700 uppercase tracking-wide">
              Blocked
            </span>
          </div>
          <ul className="space-y-0.5">
            {errors.map((v, i) => (
              <li key={i} className="text-xs text-red-600">
                {v.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-md px-2.5 py-1.5 bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-1 mb-0.5">
            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
              Warnings
            </span>
          </div>
          <ul className="space-y-0.5">
            {warnings.map((v, i) => (
              <li key={i} className="text-xs text-amber-600">
                {v.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  const { user } = useAuth();
  const canManage =
    user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // ---- week navigation ----
  const [currentWeek, setCurrentWeek] = useState<Date>(() =>
    getWeekStart(new Date()),
  );

  // ---- location selection ----
  const [selectedLocationId, setSelectedLocationId] = useState('');

  // ---- dialog visibility ----
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [assignPanelOpen, setAssignPanelOpen] = useState(false);

  // ---- form state ----
  const [shiftForm, setShiftForm] = useState<ShiftFormState>(() =>
    defaultShiftForm(''),
  );
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // ---- page-level error ----
  const [pageError, setPageError] = useState<string | null>(null);

  // ---- assign panel state ----
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  // Per-staff result: 'loading' while in-flight, AssignResult once done
  const [staffResult, setStaffResult] = useState<Map<string, 'loading' | AssignResult>>(new Map());

  // ---- schedule query ----
  const { data, loading, refetch, error: scheduleError } = useQuery(GET_WEEK_SCHEDULE, {
    variables: { locationId: selectedLocationId, week: currentWeek },
    skip: !selectedLocationId,
    pollInterval: 10000,
    notifyOnNetworkStatusChange: true,
  });

  // ---- locations query ----
  const { data: locationsData, error: locationsError } = useQuery(GET_LOCATIONS);
  const locations: Location[] = locationsData?.locations ?? [];
  const selectedLocation = locations.find((location) => location.id === selectedLocationId) ?? null;
  const selectedTimezone =
    selectedLocation?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ---- staff by location query ----
  const { data: staffData, error: staffError } = useQuery(GET_STAFF_BY_LOCATION, {
    variables: { locationId: selectedLocationId },
    skip: !selectedLocationId || !assignPanelOpen,
  });
  const staffList: StaffMember[] = staffData?.staffByLocation ?? [];

  // ---- mutations ----
  const [createShift, { loading: creating }] = useMutation(CREATE_SHIFT, {
    onCompleted: () => {
      setCreateDialogOpen(false);
      setPageError(null);
      refetch();
    },
    onError: (e) => setPageError(e.message),
  });

  const [updateShift, { loading: updating }] = useMutation(UPDATE_SHIFT, {
    onCompleted: () => {
      setEditDialogOpen(false);
      setEditingShift(null);
      setPageError(null);
      refetch();
    },
    onError: (e) => setPageError(e.message),
  });

  const [deleteShift, { loading: deleting }] = useMutation(DELETE_SHIFT, {
    onCompleted: () => {
      setDeleteConfirmId(null);
      setPageError(null);
      refetch();
    },
    onError: (e) => setPageError(e.message),
  });

  const [assignStaff] = useMutation(ASSIGN_STAFF);
  const [unassignStaff, { loading: unassigning }] = useMutation(UNASSIGN_STAFF);
  const [publishShift, { loading: publishingShift }] = useMutation(PUBLISH_SHIFT, {
    onCompleted: () => {
      setPageError(null);
      refetch();
    },
    onError: (e) => setPageError(formatAppError(e)),
  });
  const [publishSchedule, { loading: publishing }] = useMutation(
    PUBLISH_SCHEDULE,
    {
      onCompleted: () => {
        setPageError(null);
        refetch();
      },
      onError: (e) => setPageError(formatAppError(e)),
    },
  );
  const [unpublishSchedule, { loading: unpublishing }] = useMutation(
    UNPUBLISH_SCHEDULE,
    {
      onCompleted: () => {
        setPageError(null);
        refetch();
      },
      onError: (e) => setPageError(formatAppError(e)),
    },
  );

  // ---- derived data ----
  const shifts: Shift[] = data?.weekSchedule?.shifts ?? [];

  const shiftsByDay = DAYS.map((_, i) => {
    const dayDate = new Date(currentWeek);
    dayDate.setDate(currentWeek.getDate() + i);
    dayDate.setHours(12, 0, 0, 0);
    const dateKey = getDateKeyInTimeZone(dayDate, selectedTimezone);
    return {
      day: getDayLabelInTimeZone(dayDate, selectedTimezone),
      date: dayDate,
      dateKey,
      shifts: shifts.filter(
        (s) => getDateKeyInTimeZone(new Date(s.startTime), selectedTimezone) === dateKey,
      ),
    };
  });

  const weekHasPublished = shifts.some((s) => s.status === 'PUBLISHED');

  // ---- handlers: shift form ----

  const openCreateDialog = useCallback(() => {
    setShiftForm(defaultShiftForm(selectedLocationId));
    setCreateDialogOpen(true);
  }, [selectedLocationId]);

  const openEditDialog = useCallback((shift: Shift) => {
    const startDate = new Date(shift.startTime);
    const endDate = new Date(shift.endTime);
    setEditingShift(shift);
    setShiftForm({
      locationId: shift.locationId,
      date: toLocalDateStr(startDate),
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: endDate.toTimeString().slice(0, 5),
      requiredSkill: shift.requiredSkill.toUpperCase() as Skill,
      headcount: shift.headcount,
      editCutoffHours: shift.editCutoffHours,
    });
    setEditDialogOpen(true);
  }, []);

  const handleCreateSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      createShift({
        variables: {
          input: {
            locationId: shiftForm.locationId,
            startTime: buildShiftDateTime(shiftForm.date, shiftForm.startTime, selectedTimezone),
            endTime: buildShiftDateTime(shiftForm.date, shiftForm.endTime, selectedTimezone),
            requiredSkill: shiftForm.requiredSkill.toLowerCase(),
            headcount: shiftForm.headcount,
            editCutoffHours: shiftForm.editCutoffHours,
          },
        },
      });
    },
    [createShift, selectedTimezone, shiftForm],
  );

  const handleEditSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingShift) return;
      updateShift({
        variables: {
          id: editingShift.id,
          input: {
            startTime: buildShiftDateTime(shiftForm.date, shiftForm.startTime, selectedTimezone),
            endTime: buildShiftDateTime(shiftForm.date, shiftForm.endTime, selectedTimezone),
            requiredSkill: shiftForm.requiredSkill.toLowerCase(),
            headcount: shiftForm.headcount,
            editCutoffHours: shiftForm.editCutoffHours,
          },
        },
      });
    },
    [updateShift, editingShift, selectedTimezone, shiftForm],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteShift({ variables: { id } });
    },
    [deleteShift],
  );

  // ---- handlers: assign panel ----

  const openAssignPanel = useCallback((shift: Shift) => {
    setActiveShift(shift);
    setStaffResult(new Map());
    setAssignPanelOpen(true);
  }, []);

  const handleAssignAttempt = useCallback(
    async (staffMember: StaffMember) => {
      if (!activeShift) return;
      setStaffResult((prev) => new Map(prev).set(staffMember.id, 'loading'));
      try {
        const { data } = await assignStaff({
          variables: { shiftId: activeShift.id, userId: staffMember.id },
        });
        const result: AssignResult = data.assignStaff;
        setPageError(null);
        setStaffResult((prev) => new Map(prev).set(staffMember.id, result));
        if (result.success) {
          const { data: refreshed } = await refetch();
          if (refreshed) {
            const updated = refreshed.weekSchedule?.shifts?.find(
              (s: Shift) => s.id === activeShift.id,
            );
            if (updated) setActiveShift(updated);
          }
        }
      } catch (error) {
        setPageError(formatAppError(error));
        setStaffResult((prev) => {
          const next = new Map(prev);
          next.delete(staffMember.id);
          return next;
        });
      }
    },
    [activeShift, assignStaff, refetch],
  );

  const handleUnassign = useCallback(
    async (assignment: Assignment) => {
      if (!activeShift) return;
      try {
        await unassignStaff({
          variables: { shiftId: activeShift.id, userId: assignment.userId },
        });
        setPageError(null);
        // Clear the per-staff result so they can be re-assigned
        setStaffResult((prev) => {
          const next = new Map(prev);
          next.delete(assignment.userId);
          return next;
        });
        const { data: refreshed } = await refetch();
        if (refreshed) {
          const updated = refreshed.weekSchedule?.shifts?.find(
            (s: Shift) => s.id === activeShift.id,
          );
          if (updated) setActiveShift(updated);
        }
      } catch (error) {
        setPageError(formatAppError(error));
      }
    },
    [activeShift, unassignStaff, refetch],
  );

  // ---- staff name lookup ----
  const staffById = new Map(staffList.map((s) => [s.id, s]));
  const getStaffName = (userId: string) => {
    const s = staffById.get(userId);
    return s ? `${s.firstName} ${s.lastName}` : userId;
  };

  // ---- shift form shared markup ----
  const renderShiftForm = (
    onSubmit: (e: React.FormEvent) => void,
    isSubmitting: boolean,
    submitLabel: string,
    onCancel: () => void,
  ) => (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <select
          required
          value={shiftForm.locationId}
          onChange={(e) =>
            setShiftForm((f) => ({ ...f, locationId: e.target.value }))
          }
          className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select location…</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          required
          value={shiftForm.date}
          onChange={(e) =>
            setShiftForm((f) => ({ ...f, date: e.target.value }))
          }
          className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Start / End time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time
          </label>
          <input
            type="time"
            required
            value={shiftForm.startTime}
            onChange={(e) =>
              setShiftForm((f) => ({ ...f, startTime: e.target.value }))
            }
            className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Time
          </label>
          <input
            type="time"
            required
            value={shiftForm.endTime}
            onChange={(e) =>
              setShiftForm((f) => ({ ...f, endTime: e.target.value }))
            }
            className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Skill */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Required Skill
        </label>
        <select
          required
          value={shiftForm.requiredSkill}
          onChange={(e) =>
            setShiftForm((f) => ({
              ...f,
              requiredSkill: e.target.value as Skill,
            }))
          }
          className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SKILLS.map((s) => (
            <option key={s} value={s}>
              {SKILL_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Headcount + Edit cutoff */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Headcount
          </label>
          <input
            type="number"
            required
            min={1}
            value={shiftForm.headcount}
            onChange={(e) =>
              setShiftForm((f) => ({
                ...f,
                headcount: Number(e.target.value),
              }))
            }
            className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Edit Cutoff (hrs)
          </label>
          <input
            type="number"
            required
            min={0}
            value={shiftForm.editCutoffHours}
            onChange={(e) =>
              setShiftForm((f) => ({
                ...f,
                editCutoffHours: Number(e.target.value),
              }))
            }
            className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <DialogFooter className="pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </DialogFooter>
    </form>
  );

  // ---- render ----
  return (
    <div className="flex flex-col h-full">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <Header
        title="Schedule"
        subtitle={`Week of ${formatDateInTimeZone(currentWeek, selectedTimezone)}${selectedLocation ? ` · ${selectedLocation.timezone}` : ''}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Location select */}
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="border border-gray-300 pl-7 pr-8 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px]"
              >
                <option value="">All locations…</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Week navigation */}
            <button
              onClick={() =>
                setCurrentWeek(
                  new Date(currentWeek.getTime() - 7 * 86400000),
                )
              }
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Previous week"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setCurrentWeek(getWeekStart(new Date()))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              Today
            </button>
            <button
              onClick={() =>
                setCurrentWeek(
                  new Date(currentWeek.getTime() + 7 * 86400000),
                )
              }
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Next week"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>

            {/* Manager actions */}
            {canManage && selectedLocationId && (
              <>
                <button
                  onClick={openCreateDialog}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Shift
                </button>

                {weekHasPublished ? (
                  <button
                    disabled={unpublishing}
                    onClick={() =>
                      unpublishSchedule({
                        variables: {
                          locationId: selectedLocationId,
                          week: currentWeek,
                        },
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50 transition-colors"
                  >
                    {unpublishing ? 'Unpublishing…' : 'Unpublish Schedule'}
                  </button>
                ) : (
                  <button
                    disabled={publishing}
                    onClick={() =>
                      publishSchedule({
                        variables: {
                          locationId: selectedLocationId,
                          week: currentWeek,
                        },
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {publishing ? 'Publishing…' : 'Publish Schedule'}
                  </button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                                 */}
      {/* ------------------------------------------------------------------ */}
      {(locationsError || scheduleError || staffError || pageError) && (
        <ErrorBanner
          className="mx-6 mt-4"
          title="Schedule action failed"
          message={pageError ?? formatAppError(locationsError ?? scheduleError ?? staffError)}
          onDismiss={pageError ? () => setPageError(null) : undefined}
        />
      )}

      {!selectedLocationId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
          <MapPin className="w-10 h-10" />
          <p className="text-base">Select a location above to view the schedule</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2 min-w-[700px]">
              {shiftsByDay.map(({ day, date, shifts: dayShifts }) => {
                const isToday =
                  getDateKeyInTimeZone(date, selectedTimezone) ===
                  getDateKeyInTimeZone(new Date(), selectedTimezone);
                return (
                  <div key={day} className="min-h-[200px]">
                    {/* Day header */}
                    <div className="text-center mb-2 pb-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        {day}
                      </p>
                      <p
                        className={`text-xl font-semibold mt-0.5 w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                          isToday
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-900'
                        }`}
                      >
                        {getDayNumberInTimeZone(date, selectedTimezone)}
                      </p>
                    </div>

                    {/* Shift cards */}
                    <div className="space-y-1.5">
                      {dayShifts.map((shift) => (
                        <ShiftCard
                          key={shift.id}
                          shift={shift}
                          canManage={canManage}
                          onEdit={() => openEditDialog(shift)}
                          onDeleteRequest={() =>
                            setDeleteConfirmId(shift.id)
                          }
                          onAssign={() => openAssignPanel(shift)}
                          onPublish={() => publishShift({ variables: { id: shift.id } })}
                          publishingShift={publishingShift}
                          deleteConfirmActive={
                            deleteConfirmId === shift.id
                          }
                          onDeleteConfirm={() => handleDelete(shift.id)}
                          onDeleteCancel={() => setDeleteConfirmId(null)}
                          deleting={deleting}
                          timeZone={selectedTimezone}
                        />
                      ))}

                      {canManage && (
                        <button
                          onClick={() => {
                            setShiftForm({
                              ...defaultShiftForm(selectedLocationId),
                              date: toLocalDateStr(date),
                            });
                            setCreateDialogOpen(true);
                          }}
                          className="w-full text-center text-gray-300 hover:text-blue-400 hover:bg-blue-50 rounded-lg py-2 text-xs transition-colors border border-dashed border-gray-200 hover:border-blue-300"
                        >
                          <Plus className="w-3.5 h-3.5 inline mr-0.5" />
                          Add
                        </button>
                      )}

                      {dayShifts.length === 0 && !canManage && (
                        <div className="text-center text-gray-300 text-xs py-4">
                          No shifts
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Create Shift Dialog                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Create Shift
            </DialogTitle>
          </DialogHeader>
          {renderShiftForm(
            handleCreateSubmit,
            creating,
            'Create Shift',
            () => setCreateDialogOpen(false),
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Edit Shift Dialog                                                    */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              Edit Shift
            </DialogTitle>
          </DialogHeader>
          {renderShiftForm(
            handleEditSubmit,
            updating,
            'Save Changes',
            () => {
              setEditDialogOpen(false);
              setEditingShift(null);
            },
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Assign Staff Dialog / Panel                                          */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={assignPanelOpen} onOpenChange={setAssignPanelOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              {activeShift
                ? `Assign Staff — ${formatTimeInTimeZone(activeShift.startTime, selectedTimezone)} – ${formatTimeInTimeZone(activeShift.endTime, selectedTimezone)} · ${SKILL_LABELS[activeShift.requiredSkill?.toUpperCase() as Skill] ?? activeShift.requiredSkill}`
                : 'Assign Staff'}
            </DialogTitle>
          </DialogHeader>

          {activeShift && (
            <div className="mt-4 space-y-5">
              {/* Current assignments */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Current Assignments
                  <span className="ml-1 text-xs text-gray-400">
                    ({activeShift.assignments.length}/{activeShift.headcount})
                  </span>
                </h3>
                {activeShift.assignments.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    No staff assigned yet
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {activeShift.assignments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                      >
                        <span className="text-sm text-gray-800">
                          {getStaffName(a.userId)}
                        </span>
                        {canManage && (
                          <button
                            disabled={unassigning}
                            onClick={() => handleUnassign(a)}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            Unassign
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Staff list */}
              {canManage && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-blue-500" />
                    Add Staff
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      — certified staff at this location
                    </span>
                  </h3>
                  {staffList.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                      No certified staff found for this location
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {staffList.map((s) => {
                        const alreadyAssigned = activeShift.assignments.some(
                          (a) => a.userId === s.id,
                        );
                        const result = staffResult.get(s.id);
                        const isLoading = result === 'loading';
                        const assignResult = result !== undefined && result !== 'loading' ? result as AssignResult : null;
                        const hasSkill = s.skills
                          ?.map((sk: string) => sk.toUpperCase())
                          .includes(activeShift.requiredSkill?.toUpperCase() ?? '');

                        return (
                          <li
                            key={s.id}
                            className={`border rounded-lg p-2.5 transition-colors ${
                              alreadyAssigned || (assignResult?.success)
                                ? 'border-green-200 bg-green-50'
                                : assignResult && !assignResult.success
                                  ? 'border-red-100 bg-red-50/30'
                                  : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {s.firstName} {s.lastName}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {s.skills
                                    ?.map((sk: string) => SKILL_LABELS[sk.toUpperCase() as Skill] ?? sk)
                                    .join(', ') || 'No skills listed'}
                                  {!hasSkill && (
                                    <span className="ml-1 text-amber-600">· skill mismatch</span>
                                  )}
                                </p>
                              </div>

                              {alreadyAssigned || assignResult?.success ? (
                                <span className="text-xs text-green-600 font-medium shrink-0 flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Assigned
                                </span>
                              ) : (
                                <button
                                  disabled={isLoading}
                                  onClick={() => handleAssignAttempt(s)}
                                  className="px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0"
                                >
                                  {isLoading ? (
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                                  ) : (
                                    <UserPlus className="w-3 h-3" />
                                  )}
                                  {isLoading ? 'Assigning…' : 'Assign'}
                                </button>
                              )}
                            </div>

                            {/* Show result after attempt */}
                            {assignResult && !assignResult.success && (
                              <div className="mt-2">
                                <ViolationList
                                  violations={[
                                    ...(assignResult.violations ?? []),
                                    ...(assignResult.overtimeWarnings ?? []).map((w) => ({
                                      ...w,
                                      severity: 'error' as const,
                                    })),
                                  ]}
                                  compact
                                />
                                {assignResult.suggestions && assignResult.suggestions.length > 0 && (
                                  <p className="text-xs text-blue-600 mt-1.5">
                                    Try instead:{' '}
                                    {assignResult.suggestions.slice(0, 2).map((sg, i) => (
                                      <span key={sg.userId}>
                                        {i > 0 && ', '}
                                        {sg.firstName} {sg.lastName}
                                      </span>
                                    ))}
                                  </p>
                                )}
                              </div>
                            )}
                            {assignResult?.success && (assignResult.violations ?? []).length > 0 && (
                              <div className="mt-1.5">
                                <ViolationList violations={assignResult.violations ?? []} compact />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShiftCard component (extracted for clarity)
// ---------------------------------------------------------------------------

interface ShiftCardProps {
  shift: Shift;
  canManage: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onAssign: () => void;
  onPublish: () => void;
  publishingShift: boolean;
  deleteConfirmActive: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  deleting: boolean;
  timeZone: string;
}

function ShiftCard({
  shift,
  canManage,
  onEdit,
  onDeleteRequest,
  onAssign,
  onPublish,
  publishingShift,
  deleteConfirmActive,
  onDeleteConfirm,
  onDeleteCancel,
  deleting,
  timeZone,
}: ShiftCardProps) {
  const isDraft = shift.status === 'DRAFT';
  const isPublished = shift.status === 'PUBLISHED';

  const statusColors = isPublished
    ? 'bg-green-50 border-green-200'
    : isDraft
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-gray-50 border-gray-200';

  const badgeColors = isPublished
    ? 'bg-green-100 text-green-700'
    : isDraft
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-gray-100 text-gray-600';

  const assignedCount = shift.assignments.length;
  const filledRatio = shift.headcount > 0 ? assignedCount / shift.headcount : 0;
  const isFull = assignedCount >= shift.headcount;

  return (
    <div
      className={`rounded-lg text-xs border ${statusColors} overflow-hidden`}
    >
      {/* Main info — clickable to open assign panel */}
      <button
        className="w-full text-left p-2 hover:brightness-95 transition-all"
        onClick={onAssign}
      >
        <p className="font-semibold text-gray-900">
          {formatTimeInTimeZone(shift.startTime, timeZone)}{' '}
          –{' '}
          {formatTimeInTimeZone(shift.endTime, timeZone)}
        </p>
        <p className="text-gray-600 mt-0.5">
          {SKILL_LABELS[shift.requiredSkill] ?? shift.requiredSkill}
        </p>

        {/* Staffing bar */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFull ? 'bg-green-500' : 'bg-blue-400'}`}
              style={{ width: `${Math.min(filledRatio * 100, 100)}%` }}
            />
          </div>
          <span
            className={`text-gray-500 tabular-nums ${isFull ? 'text-green-600 font-medium' : ''}`}
          >
            {assignedCount}/{shift.headcount}
          </span>
        </div>

        <span
          className={`inline-block mt-1.5 px-1.5 py-0.5 rounded font-medium ${badgeColors}`}
        >
          {shift.status}
        </span>
      </button>

      {/* Manager action buttons */}
      {canManage && (
        <div className="border-t border-inherit px-2 py-1.5 flex flex-wrap items-center gap-1">
          {isDraft && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="inline-flex min-w-[54px] items-center gap-0.5 rounded border border-blue-200 bg-white/90 px-1.5 py-0.5 text-gray-600 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-700"
                title="Edit shift"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest();
                }}
                className="inline-flex min-w-[62px] items-center gap-0.5 rounded border border-red-200 bg-white/90 px-1.5 py-0.5 text-gray-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-700"
                title="Delete shift"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPublish();
                }}
                disabled={publishingShift}
                className="inline-flex min-w-[66px] items-center gap-0.5 rounded border border-green-200 bg-white/90 px-1.5 py-0.5 text-gray-600 shadow-sm transition-colors hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
                title="Publish shift"
              >
                <CheckCircle className="w-3 h-3" />
                {publishingShift ? '…' : 'Publish'}
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssign();
            }}
            className="inline-flex min-w-[58px] items-center gap-0.5 rounded border border-gray-200 bg-white/90 px-1.5 py-0.5 text-gray-600 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-700 ml-auto"
            title="Manage staff"
          >
            <UserPlus className="w-3 h-3" />
            Staff
          </button>
        </div>
      )}

      {/* Inline delete confirmation */}
      {deleteConfirmActive && (
        <div className="bg-red-50 border-t border-red-200 px-2 py-2 space-y-1.5">
          <p className="text-red-700 font-medium text-xs flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Delete this shift?
          </p>
          <div className="flex gap-1.5">
            <button
              disabled={deleting}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConfirm();
              }}
              className="flex-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCancel();
              }}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
