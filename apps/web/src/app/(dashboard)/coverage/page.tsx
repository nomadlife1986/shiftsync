'use client';

import { useQuery, useMutation } from '@apollo/client';
import { useState } from 'react';
import {
  ArrowLeftRight,
  ArrowDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  CalendarCheck,
  Calendar,
  MapPin,
  Info,
} from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { ErrorBanner } from '../../../components/ui/error-banner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../../../components/ui/dialog';
import {
  GET_SWAP_REQUESTS,
  GET_DROP_REQUESTS,
  GET_AVAILABLE_DROPS,
  GET_USERS,
  GET_MY_SHIFTS,
  GET_LOCATIONS,
} from '../../../lib/graphql/queries';
import {
  REQUEST_SWAP,
  ACCEPT_SWAP,
  APPROVE_SWAP,
  REJECT_SWAP,
  CANCEL_SWAP,
  REQUEST_DROP,
  PICKUP_DROP,
  APPROVE_DROP,
  REJECT_DROP,
  CANCEL_DROP,
} from '../../../lib/graphql/mutations';
import { useAuth } from '../../../providers/auth-provider';
import { formatAppError } from '../../../lib/utils';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatShiftLabel(shift: any, locationsById: Map<string, any>) {
  if (!shift) return 'Shift details unavailable';
  const location = locationsById.get(shift.locationId);
  const timeZone = location?.timezone;
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(new Date(shift.startTime));
  const start = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(shift.startTime));
  const end = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(shift.endTime));
  const locationName = location?.name ? ` · ${location.name}` : '';
  return `${date} · ${start}–${end} · ${shift.requiredSkill}${locationName}`;
}

function statusLabel(status: string, kind: 'swap' | 'drop') {
  if (kind === 'swap' && status === 'PENDING_ACCEPTANCE') return 'WAITING FOR TEAMMATE';
  if (kind === 'swap' && status === 'PENDING_APPROVAL') return 'WAITING FOR MANAGER';
  if (kind === 'swap' && status === 'CANCELLED') return 'WITHDRAWN';
  if (kind === 'drop' && status === 'CANCELLED') return 'WITHDRAWN';
  if (kind === 'drop' && status === 'PICKED_UP_PENDING') return 'AWAITING APPROVAL';
  return status.replace(/_/g, ' ');
}

function Badge({ status, kind = 'swap' }: { status: string; kind?: 'swap' | 'drop' }) {
  const map: Record<string, string> = {
    PENDING_ACCEPTANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    PENDING_APPROVAL:   'bg-blue-100 text-blue-700 border-blue-200',
    APPROVED:           'bg-green-100 text-green-700 border-green-200',
    REJECTED:           'bg-red-100 text-red-700 border-red-200',
    CANCELLED:          'bg-gray-100 text-gray-500 border-gray-200',
    OPEN:               'bg-green-100 text-green-700 border-green-200',
    PICKED_UP_PENDING:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {statusLabel(status, kind)}
    </span>
  );
}

function userName(users: any[], id: string) {
  if (!id) return '—';
  const u = users.find((u: any) => u.id === id);
  return u ? `${u.firstName} ${u.lastName}` : `…${id.slice(-6)}`;
}

function locationAccent(locationId: string) {
  const accents = [
    { chip: 'bg-sky-50 text-sky-700 border-sky-200', card: 'border-l-sky-400' },
    { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', card: 'border-l-emerald-400' },
    { chip: 'bg-amber-50 text-amber-700 border-amber-200', card: 'border-l-amber-400' },
    { chip: 'bg-rose-50 text-rose-700 border-rose-200', card: 'border-l-rose-400' },
  ];
  const sum = locationId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return accents[sum % accents.length];
}

function formatShiftDateTimeParts(shift: any, locationsById: Map<string, any>) {
  const location = locationsById.get(shift?.locationId);
  const timeZone = location?.timezone;
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(new Date(shift.startTime));
  const start = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(shift.startTime));
  const end = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(shift.endTime));
  return { date, start, end, location };
}

function shiftActionHint(status: string, kind: 'swap' | 'drop', isRequester: boolean, isTarget: boolean) {
  if (kind === 'swap') {
    if (status === 'PENDING_ACCEPTANCE') {
      return isRequester
        ? 'You are waiting for the other staff member to accept before a manager can review it.'
        : isTarget
          ? 'You can accept this swap to send it to a manager for final approval.'
          : 'This swap is waiting for staff acceptance.';
    }
    if (status === 'PENDING_APPROVAL') {
      return 'Both staff have agreed. The original assignment stays in place until a manager approves the swap.';
    }
    if (status === 'CANCELLED') {
      return 'The request was withdrawn before approval. The original shift assignment stays unchanged.';
    }
  }

  if (kind === 'drop') {
    if (status === 'OPEN') return 'This shift is available for another qualified staff member to claim.';
    if (status === 'PICKED_UP_PENDING') return 'A teammate has offered coverage. The manager still needs to approve the transfer.';
    if (status === 'CANCELLED') return 'The drop request was withdrawn, so the original assignee still owns the shift.';
    if (status === 'APPROVED') return 'Coverage was approved and the replacement staff member can work the shift.';
    if (status === 'REJECTED') return 'The request was rejected. The original assignee still owns the shift.';
  }

  return null;
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3">
      {children}
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 flex-shrink-0">{children}</div>;
}

function Btn({ onClick, color, disabled, loading, children }: { onClick?: () => void; color: string; disabled?: boolean; loading?: boolean; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green:  'border border-green-700 bg-green-600 text-white shadow-sm hover:bg-green-700',
    red:    'border border-red-700 bg-red-600 text-white shadow-sm hover:bg-red-700',
    gray:   'border border-gray-300 bg-gray-100 text-gray-800 shadow-sm hover:bg-gray-200',
    orange: 'border border-amber-700 bg-amber-500 text-white shadow-sm hover:bg-amber-600',
    blue:   'border border-blue-700 bg-blue-600 text-white shadow-sm hover:bg-blue-700',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-w-[104px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap disabled:opacity-50 ${colors[color]}`}
    >
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      {children}
    </button>
  );
}

function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function ShiftMeta({
  shift,
  locationsById,
  emphasizeLocation = false,
}: {
  shift: any;
  locationsById: Map<string, any>;
  emphasizeLocation?: boolean;
}) {
  if (!shift) return null;
  const { date, start, end, location } = formatShiftDateTimeParts(shift, locationsById);
  const accent = locationAccent(shift.locationId);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-1">
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
        <Clock className="mr-1 h-3 w-3 text-gray-400" />
        {date} · {start}–{end}
      </span>
      {location && (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${emphasizeLocation ? accent.chip : 'border-gray-200 bg-white text-gray-600'}`}>
          <MapPin className="mr-1 h-3 w-3" />
          {location.name}
        </span>
      )}
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs uppercase tracking-wide text-gray-600">
        {shift.requiredSkill}
      </span>
    </div>
  );
}

// ─── Swap target dialog ───────────────────────────────────────────────────────

function SwapTargetDialog({ shift, open, onClose, onSubmit, loading, users, currentUserId, locationsById }: {
  shift: any | null; open: boolean; onClose: () => void;
  onSubmit: (shiftId: string, targetId: string) => void;
  loading: boolean; users: any[]; currentUserId: string; locationsById: Map<string, any>;
}) {
  const [targetId, setTargetId] = useState('');
  const eligible = users.filter((u) => u.id !== currentUserId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setTargetId(''); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-500" /> Request Swap
          </DialogTitle>
        </DialogHeader>
        {shift && (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-2">{formatShiftLabel(shift, locationsById)}</p>
        )}
        <form onSubmit={(e) => { e.preventDefault(); if (shift && targetId) onSubmit(shift.id, targetId); }} className="space-y-4 mt-2">
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a team member…</option>
            {eligible.map((u: any) => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
          <DialogFooter>
            <DialogClose asChild>
              <button type="button" className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">Cancel</button>
            </DialogClose>
            <button type="submit" disabled={loading || !targetId} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Request Swap
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CoveragePage() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const coverageSubtitle = canManage
    ? 'Review and approve staff swap and coverage requests'
    : 'Manage your shift swaps and drop requests';

  const [swapShift, setSwapShift] = useState<any | null>(null);
  const [dropConfirm, setDropConfirm] = useState<string | null>(null);
  const [coverageError, setCoverageError] = useState('');

  const { data: swapData,      refetch: refetchSwaps     } = useQuery(GET_SWAP_REQUESTS, { pollInterval: 10000 });
  const { data: dropData,      refetch: refetchDrops     } = useQuery(GET_DROP_REQUESTS, { pollInterval: 10000 });
  const { data: availableData, refetch: refetchAvailable } = useQuery(GET_AVAILABLE_DROPS, { pollInterval: 10000 });
  const { data: usersData                                } = useQuery(GET_USERS, { pollInterval: 30000 });
  const { data: myShiftsData,  refetch: refetchMyShifts  } = useQuery(GET_MY_SHIFTS, { pollInterval: 10000 });
  const { data: locationsData                            } = useQuery(GET_LOCATIONS, { pollInterval: 30000 });

  const swaps:     any[] = swapData?.swapRequests   ?? [];
  const drops:     any[] = dropData?.dropRequests   ?? [];
  const available: any[] = availableData?.availableDrops ?? [];
  const users:     any[] = usersData?.users         ?? [];
  const myShifts:  any[] = myShiftsData?.myShifts   ?? [];
  const locations: any[] = locationsData?.locations ?? [];
  const locationsById = new Map(locations.map((location: any) => [location.id, location]));
  const activeSwaps = swaps.filter((swap) => ['PENDING_ACCEPTANCE', 'PENDING_APPROVAL'].includes(swap.status));
  const activeDrops = drops.filter((drop) => ['OPEN', 'PICKED_UP_PENDING'].includes(drop.status));

  const [requestSwap, { loading: requestingSwap }] = useMutation(REQUEST_SWAP,  {
    onCompleted: () => {
      refetchSwaps();
      setSwapShift(null);
      setCoverageError('');
    },
    onError: (error) => setCoverageError(formatAppError(error)),
  });
  const [acceptSwap]                               = useMutation(ACCEPT_SWAP,   { onCompleted: () => refetchSwaps() });
  const [approveSwap]                              = useMutation(APPROVE_SWAP,  { onCompleted: () => refetchSwaps() });
  const [rejectSwap]                               = useMutation(REJECT_SWAP,   { onCompleted: () => refetchSwaps() });
  const [cancelSwap]                               = useMutation(CANCEL_SWAP,   { onCompleted: () => refetchSwaps() });

  const [requestDrop, { loading: requestingDrop }] = useMutation(REQUEST_DROP,  {
    onCompleted: () => {
      refetchDrops();
      refetchMyShifts();
      setDropConfirm(null);
      setCoverageError('');
    },
    onError: (error) => setCoverageError(formatAppError(error)),
  });
  const [pickupDrop]                               = useMutation(PICKUP_DROP,   {
    onCompleted: () => {
      refetchDrops();
      refetchAvailable();
      setCoverageError('');
    },
    onError: (error) => setCoverageError(formatAppError(error)),
  });
  const [approveDrop]                              = useMutation(APPROVE_DROP,  {
    onCompleted: () => {
      refetchDrops();
      refetchMyShifts();
      refetchAvailable();
      setCoverageError('');
    },
    onError: (error) => setCoverageError(formatAppError(error)),
  });
  const [rejectDrop]                               = useMutation(REJECT_DROP,   {
    onCompleted: () => {
      refetchDrops();
      refetchMyShifts();
      refetchAvailable();
      setCoverageError('');
    },
    onError: (error) => setCoverageError(formatAppError(error)),
  });
  const [cancelDrop]                               = useMutation(CANCEL_DROP,   {
    onCompleted: () => {
      refetchDrops();
      refetchMyShifts();
      refetchAvailable();
      setCoverageError('');
    },
    onError: (error) => setCoverageError(formatAppError(error)),
  });

  const pendingSwaps = activeSwaps.length;
  const pendingDrops = activeDrops.filter(d => d.status === 'PICKED_UP_PENDING').length;

  return (
    <div className="flex flex-col h-full">
      <Header title="Coverage" subtitle={coverageSubtitle} />

      <div className="flex-1 overflow-auto p-6">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => { refetchSwaps(); refetchDrops(); refetchAvailable(); refetchMyShifts(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {canManage && (
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-medium">Manager view</p>
            <p className="mt-1 text-xs text-blue-700">
              Staff create swap and drop requests from their <span className="font-medium">My Shifts</span> tab. Managers review active requests here after a staff member submits them.
            </p>
          </div>
        )}

        {coverageError && (
          <ErrorBanner
            className="mb-4"
            title="Coverage request could not be completed"
            message={coverageError}
            onDismiss={() => setCoverageError('')}
          />
        )}

        <Tabs defaultValue={canManage ? 'swaps' : 'my-shifts'}>
          <TabsList className="mb-4">
            {!canManage && (
              <TabsTrigger value="my-shifts" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                My Shifts
                {myShifts.length > 0 && (
                  <span className="ml-1 bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{myShifts.length}</span>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="swaps" className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              Swaps
              {pendingSwaps > 0 && (
                <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{pendingSwaps}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="drops" className="flex items-center gap-2">
              <ArrowDown className="w-4 h-4" />
              Drops
              {pendingDrops > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{pendingDrops}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="available" className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" />
              Available
              {available.length > 0 && (
                <span className="ml-1 bg-green-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{available.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── My Shifts */}
          {!canManage && (
            <TabsContent value="my-shifts">
              <div className="space-y-3">
                {myShifts.length === 0 && <Empty icon={Calendar} text="No upcoming assigned shifts" />}
                {myShifts.map((shift: any) => (
                  <div key={shift.id} className={`bg-white border border-gray-200 border-l-4 ${locationAccent(shift.locationId).card} rounded-xl px-4 py-3`}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">Your assigned shift</p>
                        <ShiftMeta shift={shift} locationsById={locationsById} emphasizeLocation />
                        <p className="mt-2 text-xs text-gray-500">Need coverage? Ask for a swap or offer the shift for pickup.</p>
                      </div>
                      {dropConfirm !== shift.id && (
                        <Actions>
                          <Btn color="blue" onClick={() => setSwapShift(shift)}>
                            <ArrowLeftRight className="w-3.5 h-3.5" /> Swap
                          </Btn>
                          <Btn color="orange" onClick={() => setDropConfirm(shift.id)}>
                            <ArrowDown className="w-3.5 h-3.5" /> Offer Up
                          </Btn>
                        </Actions>
                      )}
                    </div>
                    {dropConfirm === shift.id && (
                      <div className="mt-4 border-t border-orange-100 pt-4">
                        <div className="flex flex-col gap-3 rounded-xl bg-orange-50 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                          <span className="flex-1 pt-0.5 text-xs text-orange-700">Offer this shift for coverage. You still own it until someone claims it and a manager approves the handoff.</span>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Btn color="orange" onClick={() => requestDrop({ variables: { input: { shiftId: shift.id } } })} disabled={requestingDrop} loading={requestingDrop}>
                              Offer Shift
                            </Btn>
                            <Btn color="gray" onClick={() => setDropConfirm(null)}>Cancel</Btn>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {/* ── Swaps */}
          <TabsContent value="swaps">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">Active Swap Requests</h3>
              </div>
              {!canManage && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <p className="font-medium">Create new swaps from My Shifts</p>
                  <p className="mt-1 text-xs text-blue-700">This tab is only for swaps that are still waiting on another teammate or a manager.</p>
                </div>
              )}
              {activeSwaps.length === 0 && <Empty icon={ArrowLeftRight} text="No active swap requests" />}
              {activeSwaps.map((swap: any) => {
                const isRequester = swap.requesterId === user?.id;
                const isTarget    = swap.targetId    === user?.id;
                const canAccept   = isTarget    && swap.status === 'PENDING_ACCEPTANCE';
                const canCancel   = isRequester && swap.status === 'PENDING_ACCEPTANCE';
                const canManageIt = canManage   && swap.status === 'PENDING_APPROVAL';
                const hint = shiftActionHint(swap.status, 'swap', isRequester, isTarget);
                return (
                  <Row key={swap.id}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge status={swap.status} />
                        {swap.expiresAt && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDate(swap.expiresAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{userName(users, swap.requesterId)}</span>
                        {isRequester && <span className="text-blue-600"> (you)</span>}
                        {' → '}
                        <span className="font-medium">{userName(users, swap.targetId)}</span>
                        {isTarget && <span className="text-blue-600"> (you)</span>}
                      </p>
                      <ShiftMeta shift={swap.shift} locationsById={locationsById} />
                      {hint && (
                        <p className="mt-2 inline-flex items-start gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{hint}</span>
                        </p>
                      )}
                      {swap.cancelReason && (
                        <p className="text-xs text-gray-500 italic mt-1">Reason: {swap.cancelReason}</p>
                      )}
                    </div>
                    <Actions>
                      {canAccept   && <Btn color="green"  onClick={() => acceptSwap ({variables:{swapId:swap.id}})}><CheckCircle className="w-3.5 h-3.5"/>Accept</Btn>}
                      {canCancel   && <Btn color="gray"   onClick={() => cancelSwap ({variables:{swapId:swap.id}})}><XCircle     className="w-3.5 h-3.5"/>Withdraw</Btn>}
                      {canManageIt && <Btn color="green"  onClick={() => approveSwap({variables:{swapId:swap.id}})}><CheckCircle className="w-3.5 h-3.5"/>Approve</Btn>}
                      {canManageIt && <Btn color="red"    onClick={() => rejectSwap ({variables:{swapId:swap.id}})}><XCircle     className="w-3.5 h-3.5"/>Reject</Btn>}
                    </Actions>
                  </Row>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Drops */}
          <TabsContent value="drops">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-gray-900">Active Drop Requests</h3>
              </div>
              {!canManage && (
                <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                  <p className="font-medium">Offer shifts from My Shifts</p>
                  <p className="mt-1 text-xs text-orange-700">This tab shows only live drop requests that are still open or waiting for manager approval.</p>
                </div>
              )}
              {activeDrops.length === 0 && <Empty icon={ArrowDown} text="No active drop requests" />}
              {activeDrops.map((drop: any) => {
                const isRequester = drop.requesterId === user?.id;
                const canCancel   = isRequester && drop.status === 'OPEN';
                const canManageIt = canManage   && drop.status === 'PICKED_UP_PENDING';
                const hint = shiftActionHint(drop.status, 'drop', isRequester, false);
                return (
                  <Row key={drop.id}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge status={drop.status} kind="drop" />
                        {drop.expiresAt && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDate(drop.expiresAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{userName(users, drop.requesterId)}</span>
                        {isRequester && <span className="text-orange-600"> (you)</span>}
                        {drop.pickedUpById && <> → picked up by <span className="font-medium">{userName(users, drop.pickedUpById)}</span></>}
                      </p>
                      <ShiftMeta shift={drop.shift} locationsById={locationsById} />
                      {hint && (
                        <p className="mt-2 inline-flex items-start gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs text-orange-700">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{hint}</span>
                        </p>
                      )}
                      {drop.managerNote && <p className="text-xs text-gray-500 italic mt-0.5">"{drop.managerNote}"</p>}
                    </div>
                    <Actions>
                      {canCancel   && <Btn color="gray"  onClick={() => cancelDrop ({variables:{dropId:drop.id}})}><XCircle     className="w-3.5 h-3.5"/>Withdraw</Btn>}
                      {canManageIt && <Btn color="green" onClick={() => approveDrop({variables:{dropId:drop.id}})}><CheckCircle className="w-3.5 h-3.5"/>Approve</Btn>}
                      {canManageIt && <Btn color="red"   onClick={() => rejectDrop ({variables:{dropId:drop.id}})}><XCircle     className="w-3.5 h-3.5"/>Reject</Btn>}
                    </Actions>
                  </Row>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Available */}
          <TabsContent value="available">
            <div className="space-y-4">
              <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
                <p className="font-medium">Pick up open coverage requests</p>
                <p className="mt-1 text-xs text-green-700">Claiming a shift sends it to a manager for approval. The original owner keeps the shift until that approval happens.</p>
              </div>
              {available.length === 0 && <Empty icon={CalendarCheck} text="No available shifts to pick up" />}
              {available.map((drop: any) => (
                <div key={drop.id} className={`bg-white border border-gray-200 border-l-4 ${locationAccent(drop.shift?.locationId ?? drop.id).card} rounded-xl px-4 py-3`}>
                  <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    {drop.expiresAt && (
                      <span className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3" /> Expires {formatDate(drop.expiresAt)}
                      </span>
                    )}
                    <p className="text-sm text-gray-700">
                      Dropped by <span className="font-medium">{userName(users, drop.requesterId)}</span>
                    </p>
                    <ShiftMeta shift={drop.shift} locationsById={locationsById} emphasizeLocation />
                    <p className="mt-2 text-xs text-gray-500">Pick this up only if you can cover it. A manager will still review and approve the final handoff.</p>
                  </div>
                  {drop.requesterId !== user?.id && (
                    <Btn color="green" onClick={() => pickupDrop({ variables: { dropId: drop.id } })}>
                      <CalendarCheck className="w-3.5 h-3.5" /> Pick Up
                    </Btn>
                  )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SwapTargetDialog
        shift={swapShift}
        open={swapShift !== null}
        onClose={() => setSwapShift(null)}
        onSubmit={(shiftId, targetId) => requestSwap({ variables: { input: { shiftId, targetId } } })}
        loading={requestingSwap}
        users={users}
        currentUserId={user?.id ?? ''}
        locationsById={locationsById}
      />
    </div>
  );
}
