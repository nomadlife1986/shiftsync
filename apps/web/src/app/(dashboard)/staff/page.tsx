'use client';

import { useQuery, useMutation } from '@apollo/client';
import { useState } from 'react';
import {
  UserPlus,
  Users,
  Search,
  Mail,
  Briefcase,
  Clock,
  Loader2,
  Phone,
  Pencil,
} from 'lucide-react';
import { Header } from '../../../components/layout/header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../../../components/ui/dialog';
import { GET_USERS } from '../../../lib/graphql/queries';
import { CREATE_USER, UPDATE_USER } from '../../../lib/graphql/mutations';
import { useRoleGuard } from '../../../hooks/use-role-guard';

// ─── constants ───────────────────────────────────────────────────────────────

const ALL_SKILLS = [
  'BARTENDER',
  'LINE_COOK',
  'SERVER',
  'HOST',
  'BARBACK',
  'DISHWASHER',
] as const;

type Skill = (typeof ALL_SKILLS)[number];

// Blue-family palette only — no purple
const ROLE_COLORS: Record<string, string> = {
  ADMIN:   'bg-blue-100 text-blue-700',
  MANAGER: 'bg-sky-100 text-sky-700',
  STAFF:   'bg-gray-100 text-gray-600',
};

const SKILL_COLORS = [
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-sky-100 text-sky-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-lime-100 text-lime-700',
];

// Normalise skill strings from the API (may be lowercase) to our uppercase enum
function normaliseSkill(s: string): Skill {
  return s.toUpperCase() as Skill;
}

function skillColor(skill: string) {
  const upper = skill.toUpperCase();
  const idx = ALL_SKILLS.indexOf(upper as Skill);
  return SKILL_COLORS[idx >= 0 ? idx : 0];
}

// ─── Shared form field styles ─────────────────────────────────────────────────

const fieldCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

// Select-specific class: pr-8 ensures arrow indicator has breathing room
const selectCls =
  'w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

// ─── SkillPicker ─────────────────────────────────────────────────────────────

function SkillPicker({
  selected,
  onChange,
}: {
  selected: Skill[];
  onChange: (skills: Skill[]) => void;
}) {
  function toggle(skill: Skill) {
    onChange(
      selected.includes(skill)
        ? selected.filter((s) => s !== skill)
        : [...selected, skill],
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_SKILLS.map((skill) => {
        const active = selected.includes(skill);
        return (
          <button
            key={skill}
            type="button"
            onClick={() => toggle(skill)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            {skill.replace('_', ' ')}
          </button>
        );
      })}
    </div>
  );
}

// ─── Create User Dialog ───────────────────────────────────────────────────────

interface CreateForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'STAFF' | 'MANAGER';
  skills: Skill[];
  desiredWeeklyHours: string;
}

const EMPTY_CREATE: CreateForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'STAFF',
  skills: [],
  desiredWeeklyHours: '',
};

function CreateUserDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE);
  const [error, setError] = useState<string | null>(null);

  const [createUser, { loading }] = useMutation(CREATE_USER, {
    // Prepend the new user so they appear at the top immediately
    update(cache, { data }) {
      if (!data?.createUser) return;
      const existing = cache.readQuery<{ users: any[] }>({ query: GET_USERS });
      if (existing) {
        cache.writeQuery({
          query: GET_USERS,
          data: { users: [data.createUser, ...existing.users] },
        });
      }
    },
    onCompleted: () => {
      setForm(EMPTY_CREATE);
      setError(null);
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    createUser({
      variables: {
        input: {
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          email:     form.email.trim(),
          password:  form.password,
          role:      form.role,
          skills:    form.skills.map(s => s.toLowerCase()),
          desiredWeeklyHours: form.desiredWeeklyHours ? Number(form.desiredWeeklyHours) : undefined,
        },
      },
    });
  }

  function handleClose() {
    setForm(EMPTY_CREATE);
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Add Team Member
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.firstName} onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))} className={fieldCls} required placeholder="Jane" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.lastName} onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))} className={fieldCls} required placeholder="Smith" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} className={fieldCls} required placeholder="jane.smith@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
            <input type="text" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} className={`${fieldCls} font-mono`} required placeholder="Temporary password" minLength={6} />
            <p className="text-xs text-gray-400 mt-1">User can update their password after logging in.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
              <select value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value as 'STAFF' | 'MANAGER' }))} className={selectCls}>
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desired hrs/week</label>
              <input type="number" value={form.desiredWeeklyHours} onChange={(e) => setForm(p => ({ ...p, desiredWeeklyHours: e.target.value }))} className={fieldCls} placeholder="e.g. 32" min={0} max={60} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
            <SkillPicker selected={form.skills} onChange={(skills) => setForm(p => ({ ...p, skills }))} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <button type="button" className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50" onClick={handleClose}>Cancel</button>
            </DialogClose>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add Member
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Dialog ─────────────────────────────────────────────────────────

interface EditForm {
  firstName: string;
  lastName: string;
  phone: string;
  skills: Skill[];
  desiredWeeklyHours: string;
}

function EditUserDialog({
  user,
  onClose,
}: {
  user: any;
  onClose: () => void;
}) {
  // Normalise skills from backend (may be lowercase) to uppercase for the picker
  const [form, setForm] = useState<EditForm>({
    firstName:          user.firstName ?? '',
    lastName:           user.lastName  ?? '',
    phone:              user.phone     ?? '',
    skills:             (user.skills ?? []).map(normaliseSkill),
    desiredWeeklyHours: user.desiredWeeklyHours != null ? String(user.desiredWeeklyHours) : '',
  });
  const [error, setError] = useState<string | null>(null);

  // Apollo's normalised cache automatically updates the list item in-place
  // (keyed by User:${id}) so we never need to call refetch after an update.
  const [updateUser, { loading }] = useMutation(UPDATE_USER, {
    onCompleted: () => {
      setError(null);
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    updateUser({
      variables: {
        id: user.id,
        input: {
          firstName:          form.firstName.trim(),
          lastName:           form.lastName.trim(),
          phone:              form.phone.trim() || undefined,
          skills:             form.skills.map(s => s.toLowerCase()),
          desiredWeeklyHours: form.desiredWeeklyHours ? Number(form.desiredWeeklyHours) : undefined,
        },
      },
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-600" />
            Edit {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.firstName} onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))} className={fieldCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.lastName} onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))} className={fieldCls} required />
            </div>
          </div>

          {/* Email + Role — read-only info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
              <p className="text-gray-600 truncate">{user.email}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Role</p>
              <p className="text-gray-600 font-medium">{user.role}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} className={fieldCls} placeholder="+1 (555) 000-0000" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desired hrs/week</label>
            <input type="number" value={form.desiredWeeklyHours} onChange={(e) => setForm(p => ({ ...p, desiredWeeklyHours: e.target.value }))} className={fieldCls} placeholder="e.g. 32" min={0} max={60} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
            <SkillPicker selected={form.skills} onChange={(skills) => setForm(p => ({ ...p, skills }))} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <button type="button" className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50" onClick={onClose}>Cancel</button>
            </DialogClose>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              Save Changes
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffPage() {
  useRoleGuard(['ADMIN', 'MANAGER']);

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  const { data, loading } = useQuery(GET_USERS);
  const allUsers: any[] = data?.users ?? [];

  const staff = allUsers
    .filter((u) => u.role === 'STAFF' || u.role === 'MANAGER' || u.role === 'ADMIN')
    .filter((u) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });

  function getInitials(u: any) {
    return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Staff"
        subtitle={`${allUsers.length} team members`}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* ── toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        </div>

        {/* ── content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">
              {search.trim() ? 'No results match your search.' : 'No team members yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Name</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Contact</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />Skills</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Hrs/wk</span>
                  </th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    {/* Name + role */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0 select-none">
                          {getInitials(s)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-900">
                              {s.firstName} {s.lastName}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-600'}`}>
                              {s.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{s.email}</span>
                        </div>
                        {s.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            {s.phone}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Skills — normalise to uppercase for display */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.skills ?? []).length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          (s.skills ?? []).map((skill: string) => {
                            const label = skill.toUpperCase().replace('_', ' ');
                            return (
                              <span key={skill} className={`px-2 py-0.5 rounded-full text-xs font-medium ${skillColor(skill)}`}>
                                {label}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>

                    {/* Hours */}
                    <td className="px-4 py-3">
                      {s.desiredWeeklyHours != null ? (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-700 font-medium">
                          {s.desiredWeeklyHours}
                          <span className="text-gray-400 font-normal text-xs">h</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>

                    {/* Edit button */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingUser(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Dialogs */}
      <CreateUserDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}
