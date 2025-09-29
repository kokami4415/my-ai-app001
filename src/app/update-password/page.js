'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabaseはメールリンクから来たユーザーのセッションをこのページで確立する
    // middlewareでブロックしないよう、/update-password は除外済みであることが前提
  }, []);

  const onUpdate = async (e) => {
    e.preventDefault();
    setMessage('');
    if ((password || '').trim().length < 6) {
      setMessage('パスワードは6文字以上にしてください。');
      return;
    }
    if ((password || '') !== (confirm || '')) {
      setMessage('パスワード（確認）と一致しません。');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(`エラー: ${error.message}`);
        return;
      }
      setMessage('パスワードを更新しました。ログイン画面に戻ります。');
      setTimeout(() => router.replace('/login'), 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-6 text-center">パスワードを再設定</h1>
      <form className="space-y-4" onSubmit={onUpdate}>
        <div>
          <label htmlFor="newpass" className="block text-sm font-medium text-gray-700">新しいパスワード</label>
          <input id="newpass" type="password" className="mt-1 block w-full border p-2 rounded-md shadow-sm" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6文字以上" required />
        </div>
        <div>
          <label htmlFor="confirmpass" className="block text-sm font-medium text-gray-700">新しいパスワード（確認）</label>
          <input id="confirmpass" type="password" className="mt-1 block w-full border p-2 rounded-md shadow-sm" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-brand-orange text-white py-2 rounded-md hover:bg-brand-orange-dark disabled:bg-gray-400">
          {loading ? '更新中...' : '更新する'}
        </button>
      </form>
      {message && <p className="mt-4 text-center text-green-600">{message}</p>}
    </main>
  );
}


