'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FavoritesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/favorites');
      if (!res.ok) throw new Error('お気に入りの取得に失敗しました。');
      const data = await res.json();
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const removeItem = async (id) => {
    try {
      const res = await fetch('/api/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error('削除に失敗しました。');
      await fetchItems();
    } catch (e) { setError(e.message); }
  };

  const remakeMenu = async (recipe) => {
    try {
      const res = await fetch('/api/generate-recipe-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedMenu: recipe, ingredientsList: [] })
      });
      if (!res.ok) throw new Error('レシピ詳細の生成に失敗しました。');
      const details = await res.json();
      // ホーム画面のローカルストレージ仕様に合わせて保存
      const payload = { selectedRecipe: recipe, recipeDetails: details, checkedItems: {}, v: 1 };
      try { localStorage.setItem('omakase_current_recipe_v1', JSON.stringify(payload)); } catch (_) {}
      // ホームへ移動して表示
      router.push('/');
    } catch (e) { setError(e.message); }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">お気に入り</h1>
      {loading && <p>読み込み中...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && items.length === 0 && (
        <p className="text-gray-500">まだお気に入りはありません。</p>
      )}
      <div className="space-y-4">
        {items.map((row) => (
          <div key={row.id} className="border rounded-md bg-white shadow p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{new Date(row.created_at).toLocaleString()}</p>
                <h2 className="text-lg font-semibold">{row.recipe?.menu_name}</h2>
                <p className="text-sm text-gray-700 mt-1">{row.recipe?.comment}</p>
                {/* 品名（パターン別） */}
                {(() => {
                  const r = row.recipe || {};
                  const p = r.pattern || 'full_meal';
                  if (p === 'full_meal') {
                    return (
                      <ul className="mt-2 text-sm list-disc list-inside">
                        <li><strong>主菜:</strong> {r?.dishes?.main}</li>
                        <li><strong>副菜:</strong> {r?.dishes?.side}</li>
                        <li><strong>汁物:</strong> {r?.dishes?.soup}</li>
                      </ul>
                    );
                  }
                  if (p === 'one_bowl') {
                    return <p className="mt-2 text-sm"><strong>一品:</strong> {r?.dishes?.single}</p>;
                  }
                  if (p === 'one_plate') {
                    return <p className="mt-2 text-sm"><strong>ワンプレート:</strong> {r?.dishes?.plate}</p>;
                  }
                  if (p === 'bento') {
                    const items = r?.dishes?.items || [];
                    return (
                      <div className="mt-2 text-sm">
                        <p className="font-semibold">お弁当おかず</p>
                        <ul className="list-disc list-inside">
                          {items.map((it, i) => (<li key={i}>{it}</li>))}
                        </ul>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <button onClick={() => removeItem(row.id)} className="text-sm text-red-600 hover:underline">削除</button>
            </div>
            <div className="mt-3">
              <button onClick={() => remakeMenu(row.recipe)} className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">もう一回このメニューを作る</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}


