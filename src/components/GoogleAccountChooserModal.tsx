import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check, ChevronRight, ShieldCheck, Mail, User as UserIcon } from 'lucide-react';

export interface GoogleAccount {
  email: string;
  name: string;
  avatarColor?: string;
}

interface GoogleAccountChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: { email: string; name: string }) => Promise<void> | void;
  initialEmail?: string;
  initialName?: string;
}

const STORAGE_KEY = 'careconnect_google_accounts';

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-teal-600'
];

export const GoogleAccountChooserModal: React.FC<GoogleAccountChooserModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  initialEmail = '',
  initialName = ''
}) => {
  const [mode, setMode] = useState<'choose' | 'add'>('choose');
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load saved Google accounts
  useEffect(() => {
    if (!isOpen) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list: GoogleAccount[] = stored ? JSON.parse(stored) : [];

      // Default baseline accounts if none saved
      if (list.length === 0) {
        list = [
          {
            email: 'shaiksalma1125@gmail.com',
            name: 'Shaik Salma',
            avatarColor: 'bg-blue-600'
          },
          {
            email: 'citizen.kumar@gmail.com',
            name: 'Rajesh Kumar Verma',
            avatarColor: 'bg-emerald-600'
          }
        ];
      }

      // If an initial email was provided and not in the list, add it
      if (initialEmail && initialEmail.includes('@')) {
        const normalized = initialEmail.trim().toLowerCase();
        if (!list.some((a) => String(a.email || '').toLowerCase() === normalized)) {
          list.unshift({
            email: normalized,
            name: (initialName || '').trim() || normalized.split('@')[0],
            avatarColor: 'bg-purple-600'
          });
        }
      }

      setAccounts(list);
    } catch {
      setAccounts([]);
    }

    setMode('choose');
    setError(null);
    setLoading(false);
  }, [isOpen, initialEmail, initialName]);

  if (!isOpen) return null;

  const saveAccountToList = (acc: GoogleAccount) => {
    const accEmail = String(acc.email || '').toLowerCase();
    const updated = [
      acc,
      ...accounts.filter((a) => String(a.email || '').toLowerCase() !== accEmail)
    ].slice(0, 8);
    setAccounts(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleSelect = async (account: GoogleAccount) => {
    setError(null);
    setLoading(true);
    try {
      saveAccountToList(account);
      await onSelectAccount({ email: account.email, name: account.name });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate with Google account.');
      setLoading(false);
    }
  };

  const handleAddCustomAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const email = customEmail.trim().toLowerCase();
    if (!email) {
      setError('Please enter your Google email address.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }

    const name = (customName || '').trim() || String(email || '').split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const newAcc: GoogleAccount = {
      email,
      name,
      avatarColor: randomColor
    };

    setLoading(true);
    try {
      saveAccountToList(newAcc);
      await onSelectAccount({ email, name });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate with Google.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Google Brand Logo */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-semibold text-slate-800 text-sm tracking-tight">Sign in with Google</span>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 pt-5">
          <div className="mb-4 text-center sm:text-left">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {mode === 'choose' ? 'Choose an account' : 'Sign in to another Google account'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              to continue to <strong className="text-slate-800 font-semibold">Care Connect India</strong>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <X className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'choose' ? (
            <div className="space-y-2">
              {/* Account list */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                {accounts.map((acc, index) => {
                  const initial = acc.name?.charAt(0).toUpperCase() || acc.email.charAt(0).toUpperCase();
                  const color = acc.avatarColor || AVATAR_COLORS[index % AVATAR_COLORS.length];

                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelect(acc)}
                      disabled={loading}
                      className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 text-left transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full ${color} text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0`}
                        >
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {acc.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{acc.email}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                    </button>
                  );
                })}

                {/* Option to use another account */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('add');
                    setCustomEmail('');
                    setCustomName('');
                    setError(null);
                  }}
                  disabled={loading}
                  className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 text-left transition-colors text-slate-700 font-semibold text-xs group cursor-pointer border-t border-slate-100"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="group-hover:text-blue-600 transition-colors">Use another Google account</span>
                    <p className="text-[10px] text-slate-400 font-normal">Choose or enter any Gmail / Google account</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                </button>
              </div>

              {loading && (
                <div className="text-center py-2">
                  <span className="text-xs text-blue-600 font-medium animate-pulse">
                    Authenticating with Google Account...
                  </span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleAddCustomAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    id="google-custom-email-input"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  You can use any personal or workspace Google email address.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name (as on your Google Profile)
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    id="google-custom-name-input"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('choose');
                    setError(null);
                  }}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors"
                >
                  Back to accounts
                </button>

                <button
                  type="submit"
                  id="google-custom-submit-btn"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Continue to Care Connect</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Privacy Disclaimer matching Google OAuth style */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              To continue, Google will securely share your verified name, email address, and profile with{' '}
              <span className="font-semibold text-slate-600">Care Connect India</span>.
            </p>
            <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Secured by Firebase Authentication & Google Identity Services</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
