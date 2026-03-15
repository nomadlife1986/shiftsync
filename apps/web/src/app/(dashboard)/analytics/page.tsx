'use client';
import { useQuery } from '@apollo/client';
import { useMemo, useState } from 'react';
import { BarChart2, Users, Star, TrendingUp, Loader2, Info, MapPin } from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { ErrorBanner } from '../../../components/ui/error-banner';
import { GET_FAIRNESS_REPORT, GET_LOCATIONS } from '../../../lib/graphql/queries';
import { useRoleGuard } from '../../../hooks/use-role-guard';
import { formatAppError } from '../../../lib/utils';

function StatCard({ label, value, icon }: {
  label: string; value: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  useRoleGuard(['ADMIN', 'MANAGER']);

  const [locationId, setLocationId] = useState('');

  // Memoize dates — prevents new Date() on every render causing infinite refetch
  const { periodStart, periodEnd } = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 28 * 86400000);
    return { periodStart: start, periodEnd: end };
  }, []);

  const { data: locData, error: locationsError } = useQuery(GET_LOCATIONS);
  const locations: any[] = locData?.locations ?? [];

  const { data, loading, error } = useQuery(GET_FAIRNESS_REPORT, {
    variables: { locationId: locationId || undefined, periodStart, periodEnd },
    skip: !locationId,
  });

  const report = data?.fairnessReport;
  const staff: any[] = report?.staff ?? [];
  const avgHours: number = report?.averageHours ?? 0;

  // Per-staff score: how close they are to the average (0–100)
  function perStaffScore(totalHours: number): number {
    if (avgHours <= 0) return 50;
    const deviation = Math.abs(totalHours - avgHours) / avgHours;
    return Math.max(0, Math.min(100, Math.round((1 - deviation) * 100)));
  }

  const sorted = [...staff].sort((a, b) => (+b.totalHours) - (+a.totalHours));

  return (
    <div className="flex flex-col h-full">
      <Header title="Analytics" subtitle="Fairness & hours distribution" />

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
            title="Could not load analytics"
            message={formatAppError(error)}
          />
        )}

        {/* ── Location picker ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
            <MapPin className="w-4 h-4" />
            Location
          </div>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
          >
            <option value="">Select a location…</option>
            {locations.map((loc: any) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        {!locationId ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <BarChart2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a location to view analytics</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* ── Stat cards ───────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatCard
                label="Avg Hours (28d)"
                value={report?.averageHours?.toFixed(1) ?? '—'}
                icon={<TrendingUp className="w-4 h-4" />}
              />
              <StatCard
                label="Std Deviation"
                value={report?.standardDeviation != null ? (+report.standardDeviation).toFixed(2) : '—'}
                icon={<BarChart2 className="w-4 h-4" />}
              />
              <StatCard
                label="Staff Tracked"
                value={String(staff.length)}
                icon={<Users className="w-4 h-4" />}
              />
            </div>

            {/* ── Overall fairness bar ─────────────────────────────────── */}
            <div className="flex items-center gap-6 mb-6 bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-2">Overall Fairness Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 max-w-[280px]">
                    <div
                      className="h-2.5 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(100, report?.fairnessScore ?? 0)}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-gray-800">{report?.fairnessScore ?? 0}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 max-w-[180px]">
                Higher = more equitable distribution across the team
              </p>
            </div>

            {/* ── Info banner ──────────────────────────────────────────── */}
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-5 text-sm text-blue-700">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Premium shifts are Friday &amp; Saturday evenings after 6 pm. Individual score = closeness to team average.</span>
            </div>

            {/* ── Hours distribution table ─────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-200">
                <BarChart2 className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-gray-800">Hours Distribution &amp; Fairness</h3>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Staff Member</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Total hrs</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Desired</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-500" />Premium</div>
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">vs. Average</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s: any) => {
                    const score = perStaffScore(+s.totalHours);
                    const barColor = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-400';
                    const delta = s.delta ?? 0;
                    return (
                      <tr key={s.userId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-sm text-gray-900">{s.firstName} {s.lastName}</td>
                        <td className="px-5 py-3 text-sm font-semibold">{(+s.totalHours).toFixed(1)}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {s.desiredHours != null ? (
                            <span>
                              {s.desiredHours}
                              <span className={`ml-1.5 text-xs font-medium ${delta > 5 ? 'text-red-500' : delta < -5 ? 'text-yellow-600' : 'text-green-600'}`}>
                                ({delta > 0 ? '+' : ''}{(+delta).toFixed(0)}h)
                              </span>
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-400" />
                            {s.premiumShifts}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[100px]">
                              <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${Math.min(100, score)}%` }} />
                            </div>
                            <span className="text-sm font-medium text-gray-600 w-9 text-right">{score}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">No data for this location yet</td></tr>
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
