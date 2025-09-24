// src/app/login/page.js
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ブラウザ用クライアントを使用
import { useRouter } from 'next/navigation';
import TitleImage from '@/components/TitleImage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function onSignIn(e) {
    e.preventDefault();
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(`エラー: ${error.message}`);
      return;
    }
    router.push('/'); // ログイン成功後、トップページにリダイレクト
    router.refresh(); // サーバーの状態を更新するためにページをリフレッシュ
  }

  async function onSignUp(e) {
    e.preventDefault();
    setMessage('');
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

    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
    const { error } = await supabase.auth.signUp({
      email: emailTrimmed,
      password: passwordTrimmed,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setMessage(`エラー: ${error.message}`);
      return;
    }
    setMessage('確認メールを送信しました。メールボックスを確認してください。');
  }

  return (
    <main className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <TitleImage className="mb-6" size="small" />
      <h1 className="text-2xl font-bold mb-6 text-center">ログイン / 新規登録</h1>
      <form className="space-y-4" onSubmit={onSignIn}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
          <input id="email" className="mt-1 block w-full border p-2 rounded-md shadow-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="password">パスワード</label>
          <input id="password" type="password" className="mt-1 block w-full border p-2 rounded-md shadow-sm" placeholder="6文字以上" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button
          type="submit"
          className="w-full bg-brand-orange text-white py-2 rounded-md hover:bg-brand-orange-dark"
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={onSignUp}
          className="w-full border py-2 rounded-md hover:bg-gray-50"
        >
          新規登録
        </button>
      </form>
      {message && <p className="mt-4 text-center text-red-500">{message}</p>}
    </main>
  );
}