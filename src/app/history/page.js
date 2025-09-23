// src/app/history/page.js

'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Supabaseクライアントをインポート

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('recipe_history')
          .select('*')
          .order('created_at', { ascending: false }); // 新しい順に並び替え

        if (error) throw error;
        setHistory(data);
      } catch (err) {
        setError('履歴の取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">レシピ提案履歴</h1>

      {isLoading && <p>履歴を読み込んでいます...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && history.length === 0 && (
        <p className="text-gray-500">まだ提案履歴がありません。</p>
      )}

      <div className="space-y-8">
        {history.map((record) => (
          <section key={record.id} className="p-6 border rounded-lg shadow-md bg-white">
            <div className="border-b pb-4 mb-4">
              <p className="text-sm text-gray-500">{new Date(record.created_at).toLocaleString()}</p>
              <p className="mt-1"><strong>あなたの要望:</strong> {record.user_request}</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">AIからの提案</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {record.ai_response.map((recipe, index) => (
                  <div key={index} className="border p-4 rounded-md bg-green-50 shadow-sm">
                    <h3 className="text-md font-bold text-green-800">{recipe.menu_name}</h3>
                    <ul className="mt-2 text-xs list-disc list-inside">
                      <li><strong>主菜:</strong> {recipe.dishes.main}</li>
                      <li><strong>副菜:</strong> {recipe.dishes.side}</li>
                      <li><strong>汁物:</strong> {recipe.dishes.soup}</li>
                    </ul>
                    <p className="mt-2 text-xs"><strong>カロリー:</strong> {recipe.estimated_calories}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}