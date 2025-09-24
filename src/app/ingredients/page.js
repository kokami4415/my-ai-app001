// src/app/ingredients/page.js

'use client';
import { useState, useEffect } from 'react';

// カテゴリを定数として定義
const CATEGORIES = ['肉・魚', '野菜・果物', '調味料', 'その他'];

export default function IngredientsPage() {
  // State管理を刷新
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]); // 現在選択中のカテゴリ
  const [ingredientsData, setIngredientsData] = useState({}); // 全カテゴリの食材データをオブジェクトで保持
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ページ読み込み時に全食材を取得し、カテゴリ別に整形
  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/ingredients');
      if (!response.ok) throw new Error('食材リストの取得に失敗しました。');
      const allIngredients = await response.json();

      // カテゴリごとに食材をグループ化する
      const groupedData = CATEGORIES.reduce((acc, category) => {
        acc[category] = allIngredients
          .filter(ing => ing.category === category)
          .map(ing => ing.name)
          .join('\n');
        return acc;
      }, {});
      setIngredientsData(groupedData);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // テキストエリアの内容を更新するハンドラ
  const handleTextChange = (e) => {
    setIngredientsData({
      ...ingredientsData,
      [activeCategory]: e.target.value,
    });
  };

  // 現在のカテゴリの食材リストを保存する関数
  const handleSaveIngredients = async () => {
    setIsLoading(true);
    setError('');
    try {
      const ingredientsArray = ingredientsData[activeCategory]
        .split('\n')
        .filter(line => line.trim() !== '');

      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: activeCategory, // 現在のカテゴリを送信
          ingredients: ingredientsArray 
        }),
      });

      if (!response.ok) throw new Error('食材リストの保存に失敗しました。');
      alert(`${activeCategory}のリストを保存しました！`);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      <section className="p-6 border rounded-lg shadow-md bg-white">
        <h1 className="text-3xl font-bold mb-4">今ある食材リスト</h1>
        
        {/* カテゴリ選択タブ */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeCategory === category
                    ? 'border-brand-orange text-brand-orange-dark'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </nav>
        </div>

        {/* 食材入力テキストエリア */}
        <div>
          <textarea
            value={ingredientsData[activeCategory] || ''}
            onChange={handleTextChange}
            placeholder={`${activeCategory}の食材を1行に1つずつ入力...`}
            className="w-full h-64 p-2 border border-gray-300 rounded-md shadow-sm mb-4"
            disabled={isLoading}
          />
          <button 
            onClick={handleSaveIngredients} 
            disabled={isLoading} 
            className="w-full px-4 py-2 bg-brand-orange text-white rounded-md shadow-sm hover:bg-brand-orange-dark disabled:bg-gray-400"
          >
            {isLoading ? '保存中...' : `${activeCategory}のリストを保存`}
          </button>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
      </section>
    </main>
  );
}
