import { useState } from 'react';
import { Loader2, Lock, User, X } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminLoginModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminLoginModalProps) {
  const { adminLogin, loginError } = useAdminAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('islamtimes1405');
  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr(null);
    if (!username.trim() || !password.trim()) {
      setLocalErr('لطفاً نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    setLoading(true);
    const ok = await adminLogin(username.trim(), password.trim());
    setLoading(false);
    if (ok) {
      onSuccess();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200">
        <div className="bg-[#0b5e85] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-sky-200" />
            <h2 className="text-sm md:text-base font-bold">ورود به پنل مدیریت اسلام تایمز</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-neutral-50 rounded p-3 text-xs text-neutral-600 border border-neutral-200">
            <p className="font-semibold text-neutral-800 mb-1">اطلاعات پیش‌فرض مدیریت:</p>
            <p>نام کاربری: <code className="bg-white px-1.5 py-0.5 rounded border border-neutral-300 font-mono">admin</code></p>
            <p className="mt-1">رمز عبور: <code className="bg-white px-1.5 py-0.5 rounded border border-neutral-300 font-mono">islamtimes1405</code></p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              نام کاربری
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-neutral-400 absolute right-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded border border-neutral-300 pr-9 pl-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#0b5e85]"
                placeholder="نام کاربری..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              رمز عبور
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-neutral-400 absolute right-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-neutral-300 pr-9 pl-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#0b5e85]"
                placeholder="رمز عبور..."
              />
            </div>
          </div>

          {(localErr || loginError) && (
            <p className="text-xs text-[#d41a24] font-medium">
              {localErr || loginError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-semibold cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded bg-[#0b5e85] hover:bg-[#084867] text-white text-xs font-bold cursor-pointer disabled:opacity-60 transition-colors"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              ورود به مدیریت
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
