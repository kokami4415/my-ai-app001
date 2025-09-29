'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ShoppingMemoPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('未認証です。');
        const { data, error } = await supabase
          .from('shopping_memos')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (error && error.code !== 'PGRST116') throw error; // not foundは無視
        setText(data?.content || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未認証です。');
      const { error } = await supabase
        .from('shopping_memos')
        .upsert({ user_id: user.id, content: text })
        .select();
      if (error) throw error;
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      <h1 className="text-3xl font-bold mb-4">買い物メモ</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="買い物が必要なものを自由にメモ..."
        className="w-full h-80 p-2 border border-gray-300 rounded-md shadow-sm mb-3 bg-white"
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={loading} className="px-4 py-2 bg-brand-orange text-white rounded-md shadow-sm hover:bg-brand-orange-dark disabled:bg-gray-400">{loading ? '保存中...' : '保存'}</button>
        {error && <p className="text-red-500 self-center">{error}</p>}
      </div>
    </main>
  );
}


