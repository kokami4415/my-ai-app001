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
              {/* パターン表示（ai_responseの先頭要素から推定） */}
              {Array.isArray(record.ai_response) && record.ai_response[0]?.pattern && (
                <p className="mt-1 text-sm text-gray-600">
                  <strong>パターン:</strong> {(() => {
                    const p = record.ai_response[0].pattern;
                    if (p === 'full_meal') return 'しっかり一食（主菜・副菜・汁物）';
                    if (p === 'one_bowl') return '一品で満足！どんぶり・麺類';
                    if (p === 'one_plate') return 'カフェ風ワンプレートランチ';
                    if (p === 'bento') return '品数豊富なお弁当';
                    return p;
                  })()}
                </p>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">AIからの提案</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {record.ai_response.map((recipe, index) => (
                  <div key={index} className="border p-4 rounded-md bg-green-50 shadow-sm">
                    <h3 className="text-md font-bold text-green-800">{recipe.menu_name}</h3>
                    {/* 提案コメント */}
                    {recipe.comment && (
                      <div className="mt-2 relative">
                        <div className="inline-block max-w-full bg-green-50 border border-green-200 text-gray-800 rounded-xl px-3 py-2 shadow-sm">
                          <span className="text-xs">{recipe.comment}</span>
                        </div>
                        <span className="absolute -left-1 top-3 w-3 h-3 bg-green-50 border-l border-t border-green-200 rotate-45"></span>
                      </div>
                    )}
                    {/* パターン別表示 */}
                    {(() => {
                      const p = recipe.pattern || 'full_meal';
                      if (p === 'full_meal') {
                        return (
                          <ul className="mt-2 text-xs list-disc list-inside">
                            <li><strong>主菜:</strong> {recipe?.dishes?.main}</li>
                            <li><strong>副菜:</strong> {recipe?.dishes?.side}</li>
                            <li><strong>汁物:</strong> {recipe?.dishes?.soup}</li>
                          </ul>
                        );
                      }
                      if (p === 'one_bowl') {
                        return (
                          <p className="mt-2 text-xs"><strong>一品:</strong> {recipe?.dishes?.single}</p>
                        );
                      }
                      if (p === 'one_plate') {
                        return (
                          <p className="mt-2 text-xs"><strong>ワンプレート:</strong> {recipe?.dishes?.plate}</p>
                        );
                      }
                      if (p === 'bento') {
                        const items = recipe?.dishes?.items || [];
                        return (
                          <div className="mt-2 text-xs">
                            <p className="font-semibold">お弁当おかず</p>
                            <ul className="list-disc list-inside">
                              {items.map((it, i) => (<li key={i}>{it}</li>))}
                            </ul>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {/* 栄養素 */}
                    {recipe.nutrients && (
                      <div className="mt-2 text-[11px] leading-snug">
                        {recipe.nutrients.summary && (
                          <p className="mb-1"><strong>この一食の目安栄養素:</strong> {recipe.nutrients.summary}</p>
                        )}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                          {recipe.nutrients.energy && <p><strong>エネルギー:</strong> {recipe.nutrients.energy}</p>}
                          {recipe.nutrients.protein && <p><strong>たんぱく質:</strong> {recipe.nutrients.protein}</p>}
                          {recipe.nutrients.fat && <p><strong>脂質:</strong> {recipe.nutrients.fat}</p>}
                          {recipe.nutrients.carbohydrates && <p><strong>炭水化物:</strong> {recipe.nutrients.carbohydrates}</p>}
                          {recipe.nutrients.salt_equivalent && <p><strong>塩分相当量:</strong> {recipe.nutrients.salt_equivalent}</p>}
                        </div>
                      </div>
                    )}
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