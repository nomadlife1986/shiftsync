'use client';
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Header } from '../../../components/layout/header';
import { ErrorBanner } from '../../../components/ui/error-banner';
import { useAuth } from '../../../providers/auth-provider';
import { UPDATE_USER, SET_AVAILABILITY } from '../../../lib/graphql/mutations';
import { GET_ME } from '../../../lib/graphql/queries';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';
import {
  User,
  Phone,
  Clock,
  Calendar,
  Shield,
  Save,
  Check,
  Briefcase,
  MapPin,
} from 'lucide-react';
import { formatAppError } from '../../../lib/utils';
import { GET_LOCATIONS } from '../../../lib/graphql/queries';

const ALL_SKILLS = ['BARTENDER', 'LINE_COOK', 'SERVER', 'HOST', 'BARBACK', 'DISHWASHER'] as const;
type Skill = typeof ALL_SKILLS[number];

const DAYS = [
  { label: 'Monday',    dow: 1 },
  { label: 'Tuesday',   dow: 2 },
  { label: 'Wednesday', dow: 3 },
  { label: 'Thursday',  dow: 4 },
  { label: 'Friday',    dow: 5 },
  { label: 'Saturday',  dow: 6 },
  { label: 'Sunday',    dow: 0 },
];

interface DayAvailability {
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

function buildDefaultAvailability(): Record<number, DayAvailability> {
  const result: Record<number, DayAvailability> = {};
  for (const { dow } of DAYS) {
    result[dow] = { isAvailable: true, startTime: '09:00', endTime: '17:00' };
  }
  return result;
}

export default function SettingsPage() {
  const { user } = useAuth();

  // ── Profile state ────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [desiredWeeklyHours, setDesiredWeeklyHours] = useState<number | ''>(
    user?.desiredWeeklyHours ?? '',
  );
  const [skills, setSkills] = useState<Skill[]>((user?.skills as Skill[]) ?? []);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const hasHydrated = useRef(false);

  // ── Availability state ───────────────────────────────────────────────────────
  const [availability, setAvailability] = useState<Record<number, DayAvailability>>(
    buildDefaultAvailability(),
  );
  const [availSaved, setAvailSaved] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');

  // ── Queries & mutations ──────────────────────────────────────────────────────
  const { data: meData, error: meError } = useQuery(GET_ME, { fetchPolicy: 'network-only' });
  const { data: locationData } = useQuery(GET_LOCATIONS);
  const locations: any[] = locationData?.locations ?? [];
  const locationNameById = new Map(locations.map((location: any) => [location.id, location.name]));
  const me = meData?.me;
  const locationIdsForProfile =
    me?.role === 'STAFF' ? (me?.certifiedLocationIds ?? []) : (me?.managedLocationIds ?? []);
  const locationNamesForProfile = locationIdsForProfile
    .map((id: string) => locationNameById.get(id))
    .filter(Boolean);

  const [updateUser, { loading: profileLoading }] = useMutation(UPDATE_USER, {
    onCompleted: () => {
      setProfileError('');
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    },
    onError: (error) => setProfileError(formatAppError(error)),
  });

  const [setAvailabilityMutation, { loading: availLoading }] = useMutation(SET_AVAILABILITY, {
    onCompleted: () => {
      setAvailabilityError('');
      setAvailSaved(true);
      setTimeout(() => setAvailSaved(false), 2500);
    },
    onError: (error) => setAvailabilityError(formatAppError(error)),
  });

  // Hydrate from GET_ME once — never re-run after mutation cache updates
  useEffect(() => {
    if (!me || hasHydrated.current) return;
    hasHydrated.current = true;

    setFirstName(me.firstName ?? '');
    setLastName(me.lastName ?? '');
    setPhone(me.phone ?? '');
    setDesiredWeeklyHours(me.desiredWeeklyHours ?? '');
    setSkills((me.skills ?? []).map((s: string) => s.toUpperCase() as Skill));

    if (me.availability?.length) {
      const next = buildDefaultAvailability();
      for (const w of me.availability) {
        next[w.dayOfWeek] = {
          isAvailable: w.isAvailable,
          startTime: w.startTime,
          endTime: w.endTime,
        };
      }
      setAvailability(next);
    }
  }, [meData]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSaveProfile = () => {
    if (!user?.id) return;
    updateUser({
      variables: {
        id: user.id,
        input: {
          firstName,
          lastName,
          phone: phone || undefined,
          desiredWeeklyHours: desiredWeeklyHours === '' ? undefined : Number(desiredWeeklyHours),
          skills: skills.map(s => s.toLowerCase()),
        },
      },
    });
  };

  const toggleSkill = (skill: Skill) => {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill],
    );
  };

  const updateDayAvailability = (
    dow: number,
    field: keyof DayAvailability,
    value: boolean | string,
  ) => {
    setAvailability(prev => ({
      ...prev,
      [dow]: { ...prev[dow], [field]: value },
    }));
  };

  const handleSaveAvailability = () => {
    if (!user?.id) return;
    const windows = DAYS.map(({ dow }) => ({
      dayOfWeek: dow,
      startTime: availability[dow].startTime,
      endTime: availability[dow].endTime,
      isRecurring: true,
      isAvailable: availability[dow].isAvailable,
    }));
    setAvailabilityMutation({
      variables: { userId: user.id, input: { availability: windows } },
    });
  };

  // ── Shared input class ────────────────────────────────────────────────────────
  const inputCls =
    'w-full border border-gray-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow';

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="Profile, availability & account" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          {meError && (
            <ErrorBanner
              className="mb-4"
              title="Could not load account settings"
              message={formatAppError(meError)}
            />
          )}

          <Tabs defaultValue="profile">
            <TabsList className="mb-6 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User size={14} />
                Profile
              </TabsTrigger>
              <TabsTrigger value="availability" className="flex items-center gap-2">
                <Calendar size={14} />
                Availability
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Shield size={14} />
                Account
              </TabsTrigger>
            </TabsList>

            {/* ── TAB 1: PROFILE ─────────────────────────────────────────────── */}
            <TabsContent value="profile">
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                {profileError && (
                  <ErrorBanner
                    title="Could not save profile"
                    message={profileError}
                    onDismiss={() => setProfileError('')}
                  />
                )}

                {/* Name row */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <User size={16} className="text-blue-500" />
                    <h3 className="font-semibold text-gray-800">Personal Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <Phone size={13} className="text-gray-400" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className={inputCls}
                  />
                </div>

                {/* Desired weekly hours */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <Clock size={13} className="text-gray-400" />
                    Desired Weekly Hours
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={desiredWeeklyHours}
                    onChange={e =>
                      setDesiredWeeklyHours(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="e.g. 32"
                    className={inputCls + ' max-w-[160px]'}
                  />
                </div>

                {/* Skills */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-3">
                    <Briefcase size={13} className="text-gray-400" />
                    Skills
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_SKILLS.map(skill => {
                      const checked = skills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                            checked
                              ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${
                              checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                            }`}
                          >
                            {checked && <Check size={10} className="text-white stroke-[3]" />}
                          </span>
                          <span className="capitalize">
                            {skill.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-3">
                    <MapPin size={13} className="text-gray-400" />
                    {me?.role === 'STAFF' ? 'Certified Locations' : 'Managed Locations'}
                  </label>
                  {locationNamesForProfile.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {locationNamesForProfile.map((locationName: string) => (
                        <span
                          key={locationName}
                          className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                        >
                          <MapPin className="h-3 w-3" />
                          {locationName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No locations assigned.</p>
                  )}
                </div>

                {/* Save button */}
                <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileLoading}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
                  >
                    <Save size={14} />
                    {profileLoading ? 'Saving…' : 'Save Changes'}
                  </button>
                  {profileSaved && (
                    <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                      <Check size={14} className="stroke-[2.5]" />
                      Saved!
                    </span>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 2: AVAILABILITY ──────────────────────────────────────────── */}
            <TabsContent value="availability">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                {availabilityError && (
                  <ErrorBanner
                    className="mb-4"
                    title="Could not save availability"
                    message={availabilityError}
                    onDismiss={() => setAvailabilityError('')}
                  />
                )}
                <div className="flex items-center gap-2 mb-5">
                  <Calendar size={16} className="text-blue-500" />
                  <h3 className="font-semibold text-gray-800">Weekly Availability</h3>
                </div>

                <div className="space-y-2">
                  {/* Column header */}
                  <div className="grid grid-cols-[120px_1fr_1fr_1fr] gap-3 px-3 pb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    <span>Day</span>
                    <span>Available</span>
                    <span>Start</span>
                    <span>End</span>
                  </div>

                  {DAYS.map(({ label, dow }) => {
                    const day = availability[dow];
                    return (
                      <div
                        key={dow}
                        className={`grid grid-cols-[120px_1fr_1fr_1fr] gap-3 items-center px-3 py-3 rounded-lg border transition-colors ${
                          day.isAvailable
                            ? 'bg-blue-50/40 border-blue-100'
                            : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            day.isAvailable ? 'text-gray-800' : 'text-gray-400'
                          }`}
                        >
                          {label}
                        </span>

                        {/* Toggle */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={day.isAvailable}
                          onClick={() =>
                            updateDayAvailability(dow, 'isAvailable', !day.isAvailable)
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            day.isAvailable ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              day.isAvailable ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            }`}
                          />
                        </button>

                        {/* Start time */}
                        <input
                          type="time"
                          value={day.startTime}
                          disabled={!day.isAvailable}
                          onChange={e => updateDayAvailability(dow, 'startTime', e.target.value)}
                          className={`border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-opacity ${
                            day.isAvailable
                              ? 'border-gray-200 bg-white text-gray-800'
                              : 'border-gray-100 bg-gray-100 text-gray-300 cursor-not-allowed'
                          }`}
                        />

                        {/* End time */}
                        <input
                          type="time"
                          value={day.endTime}
                          disabled={!day.isAvailable}
                          onChange={e => updateDayAvailability(dow, 'endTime', e.target.value)}
                          className={`border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-opacity ${
                            day.isAvailable
                              ? 'border-gray-200 bg-white text-gray-800'
                              : 'border-gray-100 bg-gray-100 text-gray-300 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Save availability */}
                <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleSaveAvailability}
                    disabled={availLoading}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
                  >
                    <Save size={14} />
                    {availLoading ? 'Saving…' : 'Save Availability'}
                  </button>
                  {availSaved && (
                    <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                      <Check size={14} className="stroke-[2.5]" />
                      Saved!
                    </span>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 3: ACCOUNT ───────────────────────────────────────────────── */}
            <TabsContent value="account">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Shield size={16} className="text-blue-500" />
                  <h3 className="font-semibold text-gray-800">Account Info</h3>
                </div>
                <dl className="space-y-4 text-sm">
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Role
                    </dt>
                    <dd>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wide">
                        {user?.role}
                      </span>
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      User ID
                    </dt>
                    <dd className="font-mono text-xs text-gray-500 break-all bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                      {user?.id}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Email
                    </dt>
                    <dd className="text-gray-700">{user?.email}</dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {me?.role === 'STAFF' ? 'Certified Locations' : 'Managed Locations'}
                    </dt>
                    <dd>
                      {locationNamesForProfile.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {locationNamesForProfile.map((locationName: string) => (
                            <span
                              key={locationName}
                              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700"
                            >
                              <MapPin className="h-3 w-3" />
                              {locationName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">No locations assigned.</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
