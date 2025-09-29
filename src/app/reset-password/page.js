'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onReset = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const emailTrimmed = (email || '').trim();
      if (!emailTrimmed) {
        setMessage('メールアドレスを入力してください。');
        return;
      }
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(emailTrimmed, { redirectTo });
      if (error) {
        setMessage(`エラー: ${error.message}`);
        return;
      }
      setMessage('パスワードリセット用のメールを送信しました。メールボックスをご確認ください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-6 text-center">パスワードリセット</h1>
      <form className="space-y-4" onSubmit={onReset}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
          <input id="email" className="mt-1 block w-full border p-2 rounded-md shadow-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-brand-orange text-white py-2 rounded-md hover:bg-brand-orange-dark disabled:bg-gray-400">
          {loading ? '送信中...' : 'メールを送る'}
        </button>
      </form>
      {message && <p className="mt-4 text-center text-green-600">{message}</p>}
    </main>
  );
}


