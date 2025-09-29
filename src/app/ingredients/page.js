// src/app/ingredients/page.js

'use client';
import { useState, useEffect, useRef } from 'react';

// カテゴリを定数として定義
const CATEGORIES = ['肉・魚', '野菜・果物', '調味料', 'その他'];

export default function IngredientsPage() {
  // State管理を刷新
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]); // 現在選択中のカテゴリ
  const [ingredientsData, setIngredientsData] = useState({}); // 全カテゴリの食材データをオブジェクトで保持
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // 画像アップロードと候補
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [photoCandidates, setPhotoCandidates] = useState(null); // {category: [{name, maybe}]}
  const [selectedCandidates, setSelectedCandidates] = useState({}); // {category: Set(name)}
  const fileInputRef = useRef(null);

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

  // 画像アップロードハンドラ
  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSelectFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/ingredients/from-photo', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '画像解析に失敗しました。');
      }
      const data = await res.json();
      const candidates = data?.candidates || {};
      setPhotoCandidates(candidates);
      // 既定選択: maybe=false のみ選択
      const initSel = {};
      CATEGORIES.forEach(cat => {
        const arr = candidates[cat] || [];
        initSel[cat] = new Set(arr.filter(it => !it.maybe).map(it => it.name));
      });
      setSelectedCandidates(initSel);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploadingPhoto(false);
      try { e.target.value = ''; } catch (_) {}
    }
  };

  const toggleCandidate = (category, name) => {
    setSelectedCandidates(prev => {
      const next = { ...prev };
      const set = new Set(next[category] ? Array.from(next[category]) : []);
      if (set.has(name)) set.delete(name); else set.add(name);
      next[category] = set;
      return next;
    });
  };

  const reflectCandidatesToCategory = async (category, save = false) => {
    const selected = Array.from(selectedCandidates?.[category] || []);
    if (selected.length === 0) return;
    const currentLines = (ingredientsData[category] || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    const exist = new Set(currentLines);
    const merged = [...currentLines];
    for (const name of selected) {
      if (!exist.has(name)) merged.push(name);
    }
    const mergedText = merged.join('\n');
    setIngredientsData(prev => ({ ...prev, [category]: mergedText }));

    if (save) {
      try {
        setIsLoading(true);
        const response = await fetch('/api/ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, ingredients: merged }),
        });
        if (!response.ok) throw new Error('食材リストの保存に失敗しました。');
        alert(`${category}に候補を反映して保存しました！`);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
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

        {/* 写真から更新 */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleSelectFile}
          />
          <button
            type="button"
            onClick={handleClickUpload}
            disabled={isUploadingPhoto}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-400"
          >
            {isUploadingPhoto ? '画像解析中...' : '📷 写真から更新'}
          </button>
          {uploadError && <p className="text-red-500 mt-2">{uploadError}</p>}
        </div>

        {/* 検出候補（アクティブカテゴリのみ表示） */}
        {photoCandidates && (photoCandidates[activeCategory] || []).length > 0 && (
          <div className="mb-6 p-4 border rounded-md bg-green-50">
            <h2 className="text-lg font-semibold mb-2">検出された候補（{activeCategory}）</h2>
            <div className="space-y-2">
              {(photoCandidates[activeCategory] || []).map((it, idx) => (
                <label key={idx} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedCandidates?.[activeCategory]?.has(it.name) || false}
                    onChange={() => toggleCandidate(activeCategory, it.name)}
                  />
                  <span className="text-gray-800">{it.name}</span>
                  {it.maybe && <span className="text-xs text-gray-500">(不確か)</span>}
                </label>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => reflectCandidatesToCategory(activeCategory, false)}
                className="px-3 py-2 border rounded-md text-sm hover:bg-white bg-white"
              >
                選択をこのカテゴリに反映
              </button>
              <button
                type="button"
                onClick={() => reflectCandidatesToCategory(activeCategory, true)}
                className="px-3 py-2 bg-brand-orange text-white rounded-md text-sm hover:bg-brand-orange-dark"
              >
                反映して保存
              </button>
            </div>
          </div>
        )}

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
