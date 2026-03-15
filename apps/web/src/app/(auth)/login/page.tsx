'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Zap, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../../providers/auth-provider';

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateEmail(v: string) {
  if (!v.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
  return '';
}

function validatePassword(v: string) {
  if (!v) return 'Password is required';
  if (v.length < 6) return 'Password must be at least 6 characters';
  return '';
}

// ─── Demo credential quick-fill ──────────────────────────────────────────────

const DEMO_ACCOUNTS = [
  { label: 'Admin',   email: 'admin@coastaleats.com' },
  { label: 'Manager', email: 'manager-sf@coastaleats.com' },
  { label: 'Staff',   email: 'emma.wilson@coastaleats.com' },
];

// ─── Left branding panel ─────────────────────────────────────────────────────

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col w-[52%] min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-violet-600/8 blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-12 py-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/30">
            <Zap size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">ShiftSync</span>
        </div>

        {/* Hero copy */}
        <div className="flex-1 flex flex-col justify-center max-w-[380px]">
          <h1 className="text-[36px] font-bold text-white leading-[1.15] tracking-[-0.03em] mb-4">
            Scheduling that<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
              just works.
            </span>
          </h1>
          <p className="text-[15px] text-zinc-400 leading-relaxed mb-10">
            Multi-location shift scheduling for Coastal Eats — real-time updates, constraint enforcement, and fairness analytics in one place.
          </p>

          {/* Feature chips */}
          <div className="flex flex-col gap-3">
            {[
              'Constraint-aware staff assignment',
              'Real-time swap & coverage requests',
              'Overtime protection & fairness analytics',
            ].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-[13px] text-zinc-400">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-[12px] text-zinc-700">
          Coastal Eats Restaurant Group · 4 locations
        </p>
      </div>
    </div>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [touched, setTouched]   = useState({ email: false, password: false });
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading]   = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailErr    = touched.email    ? validateEmail(email)       : '';
  const passwordErr = touched.password ? validatePassword(password) : '';
  const isValid     = !validateEmail(email) && !validatePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) return;
    setLoading(true);
    setSubmitError('');
    try {
      await login(email, password);
      const redirect = searchParams.get('redirect');
      router.push(redirect && redirect.startsWith('/') ? redirect : '/schedule');
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      setSubmitError(
        msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credential')
          ? 'Incorrect email or password. Please try again.'
          : msg || 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setTouched({ email: false, password: false });
    setSubmitError('');
  };

  const inputBase =
    'w-full bg-white border rounded-[8px] px-3.5 py-2.5 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-150 focus:ring-2 focus:ring-offset-0';
  const inputOk    = `${inputBase} border-gray-200 focus:border-blue-500 focus:ring-blue-500/20`;
  const inputError = `${inputBase} border-red-400 focus:border-red-500 focus:ring-red-500/20`;

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-white lg:w-[48%]">
      {/* Mobile logo */}
      <div className="flex items-center gap-2.5 px-8 py-6 lg:hidden">
        <div className="w-8 h-8 rounded-[8px] bg-blue-600 flex items-center justify-center">
          <Zap size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[14px] font-semibold text-gray-900">ShiftSync</span>
      </div>

      {/* Form area */}
      <div className="flex-1 flex items-center justify-center px-8 py-10">
        <div className="w-full max-w-[360px]">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[24px] font-bold text-gray-900 tracking-[-0.02em] leading-none mb-2">
              Welcome back
            </h2>
            <p className="text-[14px] text-gray-500">Sign in to your ShiftSync account</p>
          </div>

          {/* Demo quick-fill */}
          <div className="mb-6 p-3.5 bg-gray-50 rounded-[10px] border border-gray-100">
            <p className="text-[11.5px] font-medium text-gray-400 uppercase tracking-wider mb-2.5">Demo accounts · password123</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map(({ label, email: e }) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => fillDemo(e)}
                  className="text-[12px] font-medium px-2.5 py-1 rounded-[6px] bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setSubmitError(''); }}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                className={emailErr ? inputError : inputOk}
                placeholder="you@coastaleats.com"
                autoComplete="email"
              />
              {emailErr && (
                <p className="flex items-center gap-1 mt-1.5 text-[12px] text-red-600">
                  <AlertCircle size={12} /> {emailErr}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setSubmitError(''); }}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  className={`${passwordErr ? inputError : inputOk} pr-10`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {passwordErr && (
                <p className="flex items-center gap-1 mt-1.5 text-[12px] text-red-600">
                  <AlertCircle size={12} /> {passwordErr}
                </p>
              )}
            </div>

            {/* API error */}
            {submitError && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-[13px] px-3.5 py-3 rounded-[8px]">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {submitError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#0a0a0a] hover:bg-zinc-800 active:bg-zinc-900 text-white text-[14px] font-semibold py-2.5 px-4 rounded-[8px] transition-colors disabled:opacity-50 shadow-sm mt-2"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Signing in…</>
              ) : (
                <>Sign in <ArrowRight size={14} /></>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-8 py-5 border-t border-gray-100">
        <p className="text-[12px] text-gray-400 text-center">
          Coastal Eats Restaurant Group · Internal use only
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <>
      <BrandPanel />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-white">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </>
  );
}
