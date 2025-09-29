'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  async function onSignUp(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const emailTrimmed = (email || '').trim();
      const passwordTrimmed = (password || '').trim();
      if (!emailTrimmed || !passwordTrimmed) {
        setMessage('メールアドレスとパスワードを入力してください。');
        return;
      }
      if (passwordTrimmed.length < 6) {
        setMessage('パスワードは6文字以上にしてください。');
        return;
      }
      if (passwordTrimmed !== (confirmPassword || '').trim()) {
        setMessage('パスワード（確認）と一致しません。');
        return;
      }
      // 事前に重複メールをチェック（サービスロールキー必須のAPI）
      try {
        const resp = await fetch('/api/auth/check-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailTrimmed }) });
        if (resp.ok) {
          const { exists } = await resp.json();
          if (exists) {
            setMessage('登録済みのメールアドレスです');
            return;
          }
        }
      } catch (_) {}
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
      const { error } = await supabase.auth.signUp({
        email: emailTrimmed,
        password: passwordTrimmed,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        const lower = String(error.message || '').toLowerCase();
        if (lower.includes('already') || lower.includes('registered') || lower.includes('exist')) {
          setMessage('登録済みのメールアドレスです');
        } else {
          setMessage(`エラー: ${error.message}`);
        }
        return;
      }
      setMessage('確認メールを送信しました。メールボックスを確認してください。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-6 text-center">新規登録</h1>
      <form className="space-y-4" onSubmit={onSignUp}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
          <input id="email" className="mt-1 block w-full border p-2 rounded-md shadow-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="password">パスワード</label>
          <input id="password" type="password" className="mt-1 block w-full border p-2 rounded-md shadow-sm" placeholder="6文字以上" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="passwordConfirm">パスワード（確認）</label>
          <input id="passwordConfirm" type="password" className="mt-1 block w-full border p-2 rounded-md shadow-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-brand-orange text-white py-2 rounded-md hover:bg-brand-orange-dark disabled:bg-gray-400">
          {loading ? '送信中...' : '登録する'}
        </button>
      </form>
      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-gray-600 hover:underline">ログインはこちら</Link>
      </div>
      {message && <p className="mt-4 text-center text-green-600">{message}</p>}
    </main>
  );
}


