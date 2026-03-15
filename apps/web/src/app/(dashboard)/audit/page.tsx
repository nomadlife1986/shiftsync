'use client';
import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { ClipboardList, Filter, Search, Loader2, Clock } from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { GET_DOMAIN_EVENTS } from '../../../lib/graphql/queries';
import { useRoleGuard } from '../../../hooks/use-role-guard';

const AGG_COLORS: Record<string, string> = {
  Shift:       'bg-blue-100 text-blue-700',
  SwapRequest: 'bg-indigo-100 text-indigo-700',
  DropRequest: 'bg-orange-100 text-orange-700',
  User:        'bg-green-100 text-green-700',
};

export default function AuditPage() {
  useRoleGuard(['ADMIN']);
  const [aggregateType, setAggregateType] = useState('');
  const [eventType, setEventType] = useState('');

  const { data, loading } = useQuery(GET_DOMAIN_EVENTS, {
    variables: {
      filter: {
        aggregateType: aggregateType || undefined,
        eventType: eventType || undefined,
      },
    },
  });

  const events: any[] = data?.domainEvents ?? [];

  return (
    <div className="flex flex-col h-full">
      <Header title="Audit Log" subtitle="Immutable event-sourced history" />

      <div className="flex-1 overflow-auto p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Filter className="w-4 h-4" />
            Filters
          </div>
          <div className="flex flex-wrap gap-3 flex-1">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Aggregate Type</label>
              <select
                value={aggregateType}
                onChange={e => setAggregateType(e.target.value)}
                className="border border-gray-200 pl-3 pr-8 py-1.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All types</option>
                <option value="Shift">Shift</option>
                <option value="SwapRequest">SwapRequest</option>
                <option value="DropRequest">DropRequest</option>
                <option value="User">User</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. ShiftPublished"
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
                  className="border border-gray-200 pl-8 pr-3 py-1.5 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <span className="text-xs text-gray-400">{events.length} event{events.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ClipboardList className="w-7 h-7" />
            </div>
            <p className="font-medium text-gray-500">No events found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Time</div>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Aggregate</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Event Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Aggregate ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ver</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e: any) => (
                  <tr key={e.id || e.aggregateId + e.version} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(e.occurredAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${AGG_COLORS[e.aggregateType] ?? 'bg-gray-100 text-gray-600'}`}>
                        {e.aggregateType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{e.eventType}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{e.aggregateId?.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">v{e.version}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
