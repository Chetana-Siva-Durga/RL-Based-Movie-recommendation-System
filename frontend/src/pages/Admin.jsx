import React, { useState, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle, Trash2, Loader2, Film, ChevronDown,
  ShieldCheck, Save, X, AlertCircle, LogIn, Mail,
  KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle2, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '../api/api';

const BASE_URL = 'http://localhost:8000/api';
const PAGE_SIZE = 15;
const GENRES = ['Action', 'Drama', 'Thriller', 'Romance', 'Comedy', 'Crime', 'Fantasy', 'Family'];
const MOODS  = ['Happy', 'Sad', 'Romantic', 'Fun', 'Thrilling', 'Inspiring', 'Intense', 'Emotional', 'Adventurous', 'Dark'];
const EMPTY_FORM = {
  title: '', genre: '', primary_mood: '', secondary_mood: '',
  year: '', director: '', lead_actor: '', imdb_rating: '',
  popularity: '5', keywords: '', description: '', poster_url: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth API helpers
// ─────────────────────────────────────────────────────────────────────────────
const authApi = {
  login: (email, password) =>
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d; }),

  forgotPassword: (email) =>
    fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d; }),

  verifyOTP: (email, otp) =>
    fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d; }),

  resetPassword: (email, otp, new_password) =>
    fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, new_password }),
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d; }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Small UI helpers
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium ${
        type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}
    >
      {type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </motion.div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400">
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN GATE  (step: 'login' | 'forgot' | 'otp' | 'reset' | 'done')
// ─────────────────────────────────────────────────────────────────────────────
function LoginGate({ onSuccess }) {
  const [step, setStep]           = useState('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [otp, setOtp]             = useState('');
  const [newPwd, setNewPwd]       = useState('');
  const [showNew, setShowNew]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [devOtp, setDevOtp]       = useState('');  // SMTP fallback

  const go = async (fn) => {
    setError('');
    setLoading(true);
    try { await fn(); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Step: Login ─────────────────────────────────────────────────────────────
  if (step === 'login') return (
    <AuthCard title="Admin Login" icon={<ShieldCheck />}>
      <p className="text-xs text-gray-400 text-center mb-6">Enter your admin credentials to continue</p>

      <Field label="Email" required>
        <Input value={email} onChange={e => setEmail(e.target.value)} type="email"
          placeholder="admin@example.com" className="h-10 rounded-xl" />
      </Field>

      <Field label="Password" required>
        <div className="relative">
          <Input value={password} onChange={e => setPassword(e.target.value)}
            type={showPwd ? 'text' : 'password'} placeholder="••••••••" className="h-10 rounded-xl pr-10" />
          <button type="button" onClick={() => setShowPwd(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>

      {error && <ErrBubble msg={error} />}

      <Button onClick={() => go(async () => {
        await authApi.login(email, password); onSuccess();
      })} disabled={loading || !email || !password}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-2">
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><LogIn className="w-4 h-4 mr-2" />Sign In</>}
      </Button>

      <button onClick={() => { setStep('forgot'); setError(''); }}
        className="w-full text-center text-xs text-indigo-500 hover:underline mt-3">
        Forgot password?
      </button>
    </AuthCard>
  );

  // ── Step: Forgot password (request OTP) ────────────────────────────────────
  if (step === 'forgot') return (
    <AuthCard title="Forgot Password" icon={<Mail />}>
      <p className="text-xs text-gray-400 text-center mb-6">
        Enter your admin email. We'll send a 6-digit OTP to reset your password.
      </p>

      <Field label="Admin Email" required>
        <Input value={email} onChange={e => setEmail(e.target.value)} type="email"
          placeholder="chetansivadurga@gmail.com" className="h-10 rounded-xl" />
      </Field>

      {error && <ErrBubble msg={error} />}
      {devOtp && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          <strong>SMTP not configured.</strong> Dev OTP: <span className="font-mono font-bold text-lg tracking-widest ml-1">{devOtp}</span>
        </div>
      )}

      <Button onClick={() => go(async () => {
        const res = await authApi.forgotPassword(email);
        if (res.dev_otp) setDevOtp(res.dev_otp);
        setStep('otp');
      })} disabled={loading || !email}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-2">
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Mail className="w-4 h-4 mr-2" />Send OTP</>}
      </Button>

      <BackBtn onClick={() => { setStep('login'); setError(''); setDevOtp(''); }} />
    </AuthCard>
  );

  // ── Step: Enter OTP ────────────────────────────────────────────────────────
  if (step === 'otp') return (
    <AuthCard title="Enter OTP" icon={<KeyRound />}>
      <p className="text-xs text-gray-400 text-center mb-2">
        A 6-digit code was sent to <strong>{email}</strong>. Valid for 10 minutes.
      </p>

      {devOtp && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-4">
          <strong>Dev mode OTP:</strong> <span className="font-mono font-bold text-lg tracking-widest ml-1">{devOtp}</span>
        </div>
      )}

      <Field label="6-Digit OTP" required>
        <Input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          type="text" maxLength="6" placeholder="_ _ _ _ _ _"
          className="h-12 rounded-xl text-center text-2xl font-bold tracking-[12px] font-mono" />
      </Field>

      {error && <ErrBubble msg={error} />}

      <Button onClick={() => go(async () => {
        await authApi.verifyOTP(email, otp); setStep('reset');
      })} disabled={loading || otp.length !== 6}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-2">
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Verify OTP'}
      </Button>

      <button onClick={() => go(async () => {
        const res = await authApi.forgotPassword(email);
        if (res.dev_otp) setDevOtp(res.dev_otp);
        setOtp('');
      })} className="w-full text-center text-xs text-indigo-500 hover:underline mt-3 flex items-center justify-center gap-1">
        <RefreshCw className="w-3 h-3" /> Resend OTP
      </button>
      <BackBtn onClick={() => { setStep('forgot'); setError(''); }} />
    </AuthCard>
  );

  // ── Step: Reset password ────────────────────────────────────────────────────
  if (step === 'reset') return (
    <AuthCard title="New Password" icon={<KeyRound />}>
      <p className="text-xs text-gray-400 text-center mb-6">OTP verified ✓ — set your new admin password.</p>

      <Field label="New Password" required>
        <div className="relative">
          <Input value={newPwd} onChange={e => setNewPwd(e.target.value)}
            type={showNew ? 'text' : 'password'} placeholder="Min 6 characters" className="h-10 rounded-xl pr-10" />
          <button type="button" onClick={() => setShowNew(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>

      {error && <ErrBubble msg={error} />}

      <Button onClick={() => go(async () => {
        await authApi.resetPassword(email, otp, newPwd); setStep('done');
      })} disabled={loading || newPwd.length < 6}
        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl mt-2">
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Reset Password'}
      </Button>
    </AuthCard>
  );

  // ── Step: Success ───────────────────────────────────────────────────────────
  if (step === 'done') return (
    <AuthCard title="Password Reset!" icon={<CheckCircle2 className="text-emerald-500" />}>
      <p className="text-sm text-gray-500 text-center mb-6">
        Your password has been updated. Please log in with your new credentials.
      </p>
      <Button onClick={() => { setStep('login'); setOtp(''); setNewPwd(''); setDevOtp(''); setPassword(''); }}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
        <LogIn className="w-4 h-4 mr-2" /> Back to Login
      </Button>
    </AuthCard>
  );
}

// Shared card shell for auth screens
function AuthCard({ title, icon, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
            {React.cloneElement(icon, { className: 'w-7 h-7 text-indigo-600' })}
          </div>
          <h1 className="text-xl font-extrabold text-gray-900">{title}</h1>
        </div>
        <div className="space-y-4">{children}</div>
      </motion.div>
    </div>
  );
}

function ErrBubble({ msg }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2.5">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 flex items-center justify-center gap-1">
      <ArrowLeft className="w-3 h-3" /> Go back
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN PANEL (shown after successful login)
// ─────────────────────────────────────────────────────────────────────────────
function AdminPanel() {
  const queryClient = useQueryClient();
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [formOpen, setFormOpen]           = useState(false);
  const [toast, setToast]                 = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resetConfirm, setResetConfirm]   = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['admin-movies'],
    queryFn: ({ pageParam = 1 }) => api.movies.list({ page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (last) => last.page < last.pages ? last.page + 1 : undefined,
    initialPageParam: 1,
  });

  const movies = data?.pages.flatMap(p => p.items) ?? [];
  const total  = data?.pages[0]?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: (d) => api.movies.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies-paginated'] });
      setForm(EMPTY_FORM); setFormOpen(false);
      showToast('Movie added successfully! 🎬');
    },
    onError: () => showToast('Failed to add movie.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.movies.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies-paginated'] });
      setDeleteConfirm(null);
      showToast('Movie deleted.');
    },
    onError: () => showToast('Failed to delete movie.', 'error'),
  });

  const resetMutation = useMutation({
    mutationFn: () => api.feedback.reset(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['movies-analytics'] });
      setResetConfirm(false);
      showToast('All feedback & stats wiped cleanly! 🧹');
    },
    onError: () => showToast('Failed to reset RL data.', 'error'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast('Title is required.', 'error'); return; }
    createMutation.mutate({
      ...form,
      year:        form.year        ? parseInt(form.year)        : null,
      imdb_rating: form.imdb_rating ? parseFloat(form.imdb_rating) : null,
      popularity:  form.popularity  ? parseFloat(form.popularity)  : 5,
    });
  };

  const setField = (k) => (v) => setForm(p => ({ ...p, [k]: v }));
  const inputCls = 'h-9 rounded-lg border-gray-200 text-sm focus:ring-indigo-400';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-xl bg-indigo-100"><ShieldCheck className="w-5 h-5 text-indigo-600" /></div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Panel</h1>
            </div>
            <p className="text-gray-500 text-sm">{total} movies in database · Add or remove movies dynamically.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setResetConfirm(true)} variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shadow-sm transition-colors">
              <AlertTriangle className="w-4 h-4 mr-2" /> Reset RL Data
            </Button>
            <Button onClick={() => setFormOpen(o => !o)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200">
              {formOpen
                ? <><X className="w-4 h-4 mr-2" />Cancel</>
                : <><PlusCircle className="w-4 h-4 mr-2" />Add Movie</>}
            </Button>
          </div>
        </motion.div>

        {/* Reset Confirmation Box */}
        <AnimatePresence>
          {resetConfirm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-full mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-800">Clear All RL Data?</h3>
                  <p className="text-sm text-red-600 mt-1">This will permanently delete all logs, user feedback, and wipe movie reward scores back to zero. Both ε-Greedy and Thompson modules will restart from scratch.</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={() => setResetConfirm(false)} className="border-red-200 text-red-700 hover:bg-red-100">Cancel</Button>
                <Button onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white">
                  {resetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Yes, wipe everything'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add form */}
        <AnimatePresence>
          {formOpen && (
            <motion.form key="add-form"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-8 overflow-hidden">
              <h2 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                <Film className="w-4 h-4 text-indigo-500" /> New Movie Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Title" required>
                  <Input className={inputCls} value={form.title} onChange={e => setField('title')(e.target.value)} placeholder="e.g. Baahubali" />
                </Field>
                <Field label="Genre">
                  <SelectField value={form.genre} onChange={setField('genre')} options={GENRES} placeholder="Select Genre" />
                </Field>
                <Field label="Primary Mood">
                  <SelectField value={form.primary_mood} onChange={setField('primary_mood')} options={MOODS} placeholder="Select Mood" />
                </Field>
                <Field label="Secondary Mood">
                  <SelectField value={form.secondary_mood} onChange={setField('secondary_mood')} options={MOODS} placeholder="Select Mood" />
                </Field>
                <Field label="Year">
                  <Input className={inputCls} type="number" value={form.year} onChange={e => setField('year')(e.target.value)} placeholder="2024" />
                </Field>
                <Field label="IMDb Rating">
                  <Input className={inputCls} type="number" value={form.imdb_rating} onChange={e => setField('imdb_rating')(e.target.value)} placeholder="8.5" step="0.1" min="0" max="10" />
                </Field>
                <Field label="Director">
                  <Input className={inputCls} value={form.director} onChange={e => setField('director')(e.target.value)} placeholder="S. S. Rajamouli" />
                </Field>
                <Field label="Lead Actor">
                  <Input className={inputCls} value={form.lead_actor} onChange={e => setField('lead_actor')(e.target.value)} placeholder="Prabhas" />
                </Field>
                <Field label="Popularity (1–10)">
                  <Input className={inputCls} type="number" value={form.popularity} onChange={e => setField('popularity')(e.target.value)} placeholder="7" step="0.5" min="1" max="10" />
                </Field>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label="Keywords (comma-separated)">
                    <Input className={inputCls} value={form.keywords} onChange={e => setField('keywords')(e.target.value)} placeholder="action, epic, war, emotion" />
                  </Field>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label="Description">
                    <textarea value={form.description} onChange={e => setField('description')(e.target.value)}
                      rows={2} placeholder="Brief plot description…"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                  </Field>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label="Poster URL">
                    <Input className={inputCls} value={form.poster_url} onChange={e => setField('poster_url')(e.target.value)} placeholder="https://image.tmdb.org/…" />
                  </Field>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {createMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
                    : <><Save className="w-4 h-4 mr-2" />Save Movie</>}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Movie</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Genre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Mood</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Director</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IMDb</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Recs</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {movies.map((movie, i) => (
                    <motion.tr key={movie.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i, 12) * 0.02 }}
                      className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {movie.poster_url && (
                            <img src={movie.poster_url} alt={movie.title}
                              className="w-9 h-12 object-cover rounded-lg flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">{movie.title}</p>
                            <p className="text-xs text-gray-400">{movie.year}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <Badge variant="secondary" className="text-[10px]">{movie.genre}</Badge>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-gray-500">{movie.primary_mood}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-gray-500">{movie.director}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-xs font-bold text-amber-600">{movie.imdb_rating ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden md:table-cell">
                        <span className="text-xs text-gray-400">{movie.recommend_count ?? 0}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {deleteConfirm === movie.id ? (
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-xs text-red-500">Delete?</span>
                            <button onClick={() => deleteMutation.mutate(movie.id)}
                              disabled={deleteMutation.isPending}
                              className="text-xs font-semibold text-red-600 hover:underline">Yes</button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="text-xs font-semibold text-gray-400 hover:underline">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(movie.id)}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasNextPage && (
              <div className="flex justify-center p-4">
                <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="rounded-xl">
                  {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ChevronDown className="w-4 h-4 mr-1.5" />Load more</>}
                </Button>
              </div>
            )}
            {movies.length === 0 && !isLoading && (
              <div className="text-center py-16 text-gray-400">No movies found.</div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && <Toast key="toast" message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export — shows LoginGate until authenticated, then AdminPanel.
// Uses React state only → login required every page visit.
// ─────────────────────────────────────────────────────────────────────────────
export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return <LoginGate onSuccess={() => setAuthenticated(true)} />;
  }
  return <AdminPanel />;
}
