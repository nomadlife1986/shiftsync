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
  Plus,
  RefreshCw,
  Loader2,
  CalendarCheck,
} from 'lucide-react';
import { Header } from '../../../components/layout/header';
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

// ─── helpers ────────────────────────────────────────────────────────────────

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : '—';
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    PENDING_ACCEPTANCE: {
      cls: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: <Clock className="w-3 h-3" />,
    },
    PENDING_APPROVAL: {
      cls: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    APPROVED: {
      cls: 'bg-green-100 text-green-700 border-green-200',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    REJECTED: {
      cls: 'bg-red-100 text-red-700 border-red-200',
      icon: <XCircle className="w-3 h-3" />,
    },
    CANCELLED: {
      cls: 'bg-gray-100 text-gray-500 border-gray-200',
      icon: <XCircle className="w-3 h-3" />,
    },
    OPEN: {
      cls: 'bg-green-100 text-green-700 border-green-200',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    PICKED_UP_PENDING: {
      cls: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      icon: <AlertCircle className="w-3 h-3" />,
    },
  };
  const { cls, icon } = map[status] ?? {
    cls: 'bg-gray-100 text-gray-500 border-gray-200',
    icon: null,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {icon}
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function userName(users: any[], id: string) {
  if (!id) return '—';
  const u = users.find((u: any) => u.id === id);
  return u ? `${u.firstName} ${u.lastName}` : shortId(id);
}

// ─── Request Drop Dialog ─────────────────────────────────────────────────────

function RequestDropDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (shiftId: string) => void;
  loading: boolean;
}) {
  const [shiftId, setShiftId] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (shiftId.trim()) onSubmit(shiftId.trim());
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-orange-500" />
            Request Drop
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift ID
            </label>
            <input
              type="text"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              placeholder="Paste the shift UUID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the ID of the shift you want to drop.
            </p>
          </div>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <button
                type="button"
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={loading || !shiftId.trim()}
              className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Request Drop
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Request Swap Dialog ─────────────────────────────────────────────────────

function RequestSwapDialog({
  open,
  onClose,
  onSubmit,
  loading,
  users,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (shiftId: string, targetId: string) => void;
  loading: boolean;
  users: any[];
  currentUserId: string;
}) {
  const [shiftId, setShiftId] = useState('');
  const [targetId, setTargetId] = useState('');

  const eligibleUsers = users.filter((u) => u.id !== currentUserId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (shiftId.trim() && targetId) onSubmit(shiftId.trim(), targetId);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-500" />
            Request Swap
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Shift ID
            </label>
            <input
              type="text"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              placeholder="Paste the shift UUID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Swap With
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">Select a team member…</option>
              {eligibleUsers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <button
                type="button"
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={loading || !shiftId.trim() || !targetId}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
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

  // ── dialogs
  const [showDropDialog, setShowDropDialog] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);

  // ── queries
  const { data: swapData, refetch: refetchSwaps } = useQuery(GET_SWAP_REQUESTS);
  const { data: dropData, refetch: refetchDrops } = useQuery(GET_DROP_REQUESTS);
  const { data: availableData, refetch: refetchAvailable } = useQuery(GET_AVAILABLE_DROPS);
  const { data: usersData } = useQuery(GET_USERS);

  const swaps: any[] = swapData?.swapRequests ?? [];
  const drops: any[] = dropData?.dropRequests ?? [];
  const available: any[] = availableData?.availableDrops ?? [];
  const users: any[] = usersData?.users ?? [];

  // ── mutations — swaps
  const [requestSwap, { loading: requestingSwap }] = useMutation(REQUEST_SWAP, {
    onCompleted: () => { refetchSwaps(); setShowSwapDialog(false); },
  });
  const [acceptSwap] = useMutation(ACCEPT_SWAP, { onCompleted: () => refetchSwaps() });
  const [approveSwap] = useMutation(APPROVE_SWAP, { onCompleted: () => refetchSwaps() });
  const [rejectSwap] = useMutation(REJECT_SWAP, { onCompleted: () => refetchSwaps() });
  const [cancelSwap] = useMutation(CANCEL_SWAP, { onCompleted: () => refetchSwaps() });

  // ── mutations — drops
  const [requestDrop, { loading: requestingDrop }] = useMutation(REQUEST_DROP, {
    onCompleted: () => { refetchDrops(); setShowDropDialog(false); },
  });
  const [pickupDrop] = useMutation(PICKUP_DROP, {
    onCompleted: () => { refetchDrops(); refetchAvailable(); },
  });
  const [approveDrop] = useMutation(APPROVE_DROP, { onCompleted: () => refetchDrops() });
  const [rejectDrop] = useMutation(REJECT_DROP, { onCompleted: () => refetchDrops() });
  const [cancelDrop] = useMutation(CANCEL_DROP, { onCompleted: () => refetchDrops() });

  // ── action handlers
  function handleRequestSwap(shiftId: string, targetId: string) {
    requestSwap({ variables: { input: { shiftId, targetId } } });
  }

  function handleRequestDrop(shiftId: string) {
    requestDrop({ variables: { input: { shiftId } } });
  }

  const pendingSwapCount = swaps.filter(
    (s) => s.status === 'PENDING_APPROVAL' || s.status === 'PENDING_ACCEPTANCE',
  ).length;
  const pendingDropCount = drops.filter(
    (d) => d.status === 'PICKED_UP_PENDING',
  ).length;

  return (
    <div className="flex flex-col h-full">
      <Header title="Coverage" subtitle="Manage shift swaps and drop requests" />

      <div className="flex-1 overflow-auto p-6">
        {/* ── action row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setShowSwapDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Request Swap
            </button>
            <button
              onClick={() => setShowDropDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              <ArrowDown className="w-4 h-4" />
              Request Drop
            </button>
          </div>
          <button
            onClick={() => { refetchSwaps(); refetchDrops(); refetchAvailable(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* ── tabs */}
        <Tabs defaultValue="swaps">
          <TabsList className="mb-4">
            <TabsTrigger value="swaps" className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              Swap Requests
              {pendingSwapCount > 0 && (
                <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {pendingSwapCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="drops" className="flex items-center gap-2">
              <ArrowDown className="w-4 h-4" />
              Drop Requests
              {pendingDropCount > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {pendingDropCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="available" className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" />
              Available Shifts
              {available.length > 0 && (
                <span className="ml-1 bg-green-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {available.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Swap Requests tab */}
          <TabsContent value="swaps">
            <div className="space-y-3">
              {swaps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ArrowLeftRight className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No swap requests</p>
                </div>
              )}
              {swaps.map((swap: any) => {
                const isRequester = swap.requesterId === user?.id;
                const isTarget = swap.targetId === user?.id;
                const canAccept =
                  isTarget && swap.status === 'PENDING_ACCEPTANCE';
                const canCancelAsRequester =
                  isRequester && swap.status === 'PENDING_ACCEPTANCE';
                const canManagerAct =
                  canManage && swap.status === 'PENDING_APPROVAL';

                return (
                  <div
                    key={swap.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <ArrowLeftRight className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900">Swap Request</p>
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-gray-500">
                              <span className="font-medium text-gray-700">Shift:</span>{' '}
                              {shortId(swap.shiftId)}
                            </p>
                            <p className="text-xs text-gray-500">
                              <span className="font-medium text-gray-700">From:</span>{' '}
                              {userName(users, swap.requesterId)}
                            </p>
                            <p className="text-xs text-gray-500">
                              <span className="font-medium text-gray-700">To:</span>{' '}
                              {userName(users, swap.targetId)}
                            </p>
                            {swap.expiresAt && (
                              <p className="text-xs text-gray-400">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Expires {formatDate(swap.expiresAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <StatusBadge status={swap.status} />
                        <div className="flex flex-wrap gap-2 justify-end">
                          {canAccept && (
                            <button
                              onClick={() => acceptSwap({ variables: { swapId: swap.id } })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Accept
                            </button>
                          )}
                          {canCancelAsRequester && (
                            <button
                              onClick={() => cancelSwap({ variables: { swapId: swap.id } })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          )}
                          {canManagerAct && (
                            <>
                              <button
                                onClick={() => approveSwap({ variables: { swapId: swap.id } })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => rejectSwap({ variables: { swapId: swap.id } })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Drop Requests tab */}
          <TabsContent value="drops">
            <div className="space-y-3">
              {drops.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ArrowDown className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No drop requests</p>
                </div>
              )}
              {drops.map((drop: any) => {
                const isRequester = drop.requesterId === user?.id;
                const canCancelDrop = isRequester && drop.status === 'OPEN';
                const canManagerAct = canManage && drop.status === 'PICKED_UP_PENDING';

                return (
                  <div
                    key={drop.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                          <ArrowDown className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900">Drop Request</p>
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-gray-500">
                              <span className="font-medium text-gray-700">Shift:</span>{' '}
                              {shortId(drop.shiftId)}
                            </p>
                            <p className="text-xs text-gray-500">
                              <span className="font-medium text-gray-700">Requester:</span>{' '}
                              {userName(users, drop.requesterId)}
                            </p>
                            {drop.pickedUpById && (
                              <p className="text-xs text-gray-500">
                                <span className="font-medium text-gray-700">Picked up by:</span>{' '}
                                {userName(users, drop.pickedUpById)}
                              </p>
                            )}
                            {drop.expiresAt && (
                              <p className="text-xs text-gray-400">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Expires {formatDate(drop.expiresAt)}
                              </p>
                            )}
                            {drop.managerNote && (
                              <p className="text-xs text-gray-500 italic">
                                &ldquo;{drop.managerNote}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <StatusBadge status={drop.status} />
                        <div className="flex flex-wrap gap-2 justify-end">
                          {canCancelDrop && (
                            <button
                              onClick={() => cancelDrop({ variables: { dropId: drop.id } })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Cancel Drop
                            </button>
                          )}
                          {canManagerAct && (
                            <>
                              <button
                                onClick={() => approveDrop({ variables: { dropId: drop.id } })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => rejectDrop({ variables: { dropId: drop.id } })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Available Shifts tab */}
          <TabsContent value="available">
            <div className="space-y-3">
              {available.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <CalendarCheck className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No available shifts to pick up</p>
                </div>
              )}
              {available.map((drop: any) => (
                <div
                  key={drop.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900">Available Shift</p>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium text-gray-700">Shift:</span>{' '}
                            {shortId(drop.shiftId)}
                          </p>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium text-gray-700">Dropped by:</span>{' '}
                            {userName(users, drop.requesterId)}
                          </p>
                          {drop.expiresAt && (
                            <p className="text-xs text-gray-400">
                              <Clock className="w-3 h-3 inline mr-1" />
                              Expires {formatDate(drop.expiresAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => pickupDrop({ variables: { dropId: drop.id } })}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex-shrink-0"
                    >
                      <CalendarCheck className="w-4 h-4" />
                      Pick Up
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs */}
      <RequestSwapDialog
        open={showSwapDialog}
        onClose={() => setShowSwapDialog(false)}
        onSubmit={handleRequestSwap}
        loading={requestingSwap}
        users={users}
        currentUserId={user?.id ?? ''}
      />
      <RequestDropDialog
        open={showDropDialog}
        onClose={() => setShowDropDialog(false)}
        onSubmit={handleRequestDrop}
        loading={requestingDrop}
      />
    </div>
  );
}
