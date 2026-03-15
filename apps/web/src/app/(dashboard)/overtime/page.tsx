'use client';
import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { AlertTriangle, ChevronLeft, ChevronRight, Users, Loader2, CheckCircle, DollarSign, MapPin } from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { ErrorBanner } from '../../../components/ui/error-banner';
import { GET_LOCATIONS, GET_OVERTIME_DASHBOARD } from '../../../lib/graphql/queries';
import { useRoleGuard } from '../../../hooks/use-role-guard';
import { formatAppError } from '../../../lib/utils';

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function StatCard({ label, value, icon, cls = '' }: {
  label: string; value: number; icon: React.ReactNode; cls?: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${cls}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium opacity-80">{label}</p>
        {icon}
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function OvertimePage() {
  useRoleGuard(['ADMIN', 'MANAGER']);
  const [week, setWeek] = useState(() => getMonday(new Date()));
  const [locationId, setLocationId] = useState('');
  const { data: locationData, error: locationsError } = useQuery(GET_LOCATIONS);
  const { data, loading, error } = useQuery(GET_OVERTIME_DASHBOARD, {
    variables: { week, locationId: locationId || undefined },
    skip: !locationId,
    pollInterval: 15000,
  });
  const locations: any[] = locationData?.locations ?? [];
  const selectedLocation = locations.find((location: any) => location.id === locationId);
  const dashboard = data?.overtimeDashboard;
  const staff: any[] = dashboard?.staff ?? [];

  const weekLabel = week.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Overtime Dashboard"
        subtitle={locationId ? `${selectedLocation?.name ?? 'Selected location'} · Week of ${weekLabel}` : 'Choose a location to review projected overtime risk'}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                className="min-w-[210px] rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select location…</option>
                {locations.map((location: any) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setWeek(new Date(week.getTime() - 7 * 86400000))}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => setWeek(getMonday(new Date()))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setWeek(new Date(week.getTime() + 7 * 86400000))}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {locationsError && (
          <ErrorBanner
            className="mb-4"
            title="Could not load locations"
            message={formatAppError(locationsError)}
          />
        )}
        {error && (
          <ErrorBanner
            className="mb-4"
            title="Could not load overtime dashboard"
            message={formatAppError(error)}
          />
        )}

        {!locationId ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-center text-gray-400">
            <MapPin className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm font-medium text-gray-500">Select a location to view overtime exposure</p>
            <p className="mt-1 text-sm">Projected hours, warnings, and payroll impact will appear here.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Total Staff"
                value={staff.length}
                icon={<Users className="w-5 h-5 text-gray-400" />}
                cls="bg-white border-gray-200"
              />
              <StatCard
                label="At Risk (35–40 hrs)"
                value={dashboard?.atRiskCount ?? 0}
                icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
                cls="bg-yellow-50 border-yellow-200 text-yellow-800"
              />
              <StatCard
                label="Overtime (40+ hrs)"
                value={dashboard?.overtimeCount ?? 0}
                icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                cls="bg-red-50 border-red-200 text-red-800"
              />
              <StatCard
                label="Projected Cost"
                value={Math.round(dashboard?.totalProjectedCost ?? 0)}
                icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
                cls="bg-emerald-50 border-emerald-200 text-emerald-800"
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Staff Member</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Total hrs</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">OT hrs</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Warnings</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s: any) => (
                    <tr key={s.userId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-sm text-gray-900">{s.firstName} {s.lastName}</td>
                      <td className="px-5 py-3 text-sm font-semibold">{(+s.totalHours).toFixed(1)}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-red-600">
                        {(+s.overtimeHours) > 0 ? `+${(+s.overtimeHours).toFixed(1)}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{s.warningCount ?? 0}</td>
                      <td className="px-5 py-3">
                        {s.totalHours >= 40 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" /> Overtime
                          </span>
                        ) : s.totalHours >= 35 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" /> At Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle className="w-3 h-3" /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">No assigned shifts for this location and week yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
