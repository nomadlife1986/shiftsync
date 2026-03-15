'use client';
import { useQuery } from '@apollo/client';
import { Radio, RefreshCw, Clock, Moon, Loader2 } from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { GET_ON_DUTY_NOW } from '../../../lib/graphql/queries';
import { useRoleGuard } from '../../../hooks/use-role-guard';

const SKILL_COLORS = [
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-sky-100 text-sky-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-lime-100 text-lime-700',
];

function skillColor(skill: string) {
  const idx = ['BARTENDER', 'LINE_COOK', 'SERVER', 'HOST', 'BARBACK', 'DISHWASHER'].indexOf(skill);
  return SKILL_COLORS[idx >= 0 ? idx : 0];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function OnDutyPage() {
  useRoleGuard(['ADMIN', 'MANAGER']);
  const { data, loading, refetch } = useQuery(GET_ON_DUTY_NOW, { pollInterval: 30000 });
  const onDuty: any[] = data?.onDutyNow ?? [];

  return (
    <div className="flex flex-col h-full">
      <Header
        title="On Duty Now"
        subtitle={onDuty.length > 0 ? `${onDuty.length} staff currently working` : 'Live view · auto-refreshes every 30s'}
        actions={
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : onDuty.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Moon className="w-7 h-7" />
            </div>
            <p className="font-medium text-gray-500">No staff currently on duty</p>
            <p className="text-sm mt-1">Auto-refreshes every 30 seconds</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {onDuty.map((entry: any) => (
              <div key={entry.userId} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                      {entry.firstName?.[0]}{entry.lastName?.[0]}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{entry.firstName} {entry.lastName}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span>{formatTime(entry.shiftStart)} – {formatTime(entry.shiftEnd)}</span>
                    </div>
                  </div>
                </div>

                {/* Live indicator */}
                <div className="flex items-center gap-1.5 mb-3">
                  <Radio className="w-3 h-3 text-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-green-600">On Duty</span>
                </div>

                {/* Skills */}
                {entry.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.skills.map((skill: string) => (
                      <span key={skill} className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${skillColor(skill)}`}>
                        {skill.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
