// src/app/page.js

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image'; // Next.jsの画像コンポーネント
import TitleImage from '@/components/TitleImage';

export default function HomePage() {
  const router = useRouter();
  // --- AI提案機能のState ---
  const [userRequest, setUserRequest] = useState(''); // ユーザーの追加要望
  const [suggestedRecipes, setSuggestedRecipes] = useState([]); // 提案されたレシピのリスト
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [errorSuggestion, setErrorSuggestion] = useState('');
  const [pattern, setPattern] = useState('full_meal'); // 献立パターン
  const LOADING_MESSAGES = ['今考えてるよー！', 'もうちょっと待ってね…', '楽しみにしててね！'];
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // レシピ詳細機能のState
  const [selectedRecipe, setSelectedRecipe] = useState(null); // ユーザーが選んだレシピ
  const [recipeDetails, setRecipeDetails] = useState(null); // AIが生成したレシピ詳細
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');
  const [checkedItems, setCheckedItems] = useState({}); // ★買い物リストのチェック状態を管理
  const STORAGE_KEY = 'omakase_current_recipe_v1';
  const [restored, setRestored] = useState(false);

  // 未ログイン時は /login へリダイレクト（暫定ガード）
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted && !data.user) {
        router.replace('/login');
      }
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  // ---- 画面状態の保存・復元 ----
  // 保存
  useEffect(() => {
    // 復元前は書き込みしない
    if (!restored) return;
    const payload = {
      selectedRecipe,
      recipeDetails,
      checkedItems,
      v: 1,
    };
    try {
      if (selectedRecipe && recipeDetails) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (_) {
      // storage不可（Safariプライベート等）の場合は無視
    }
  }, [selectedRecipe, recipeDetails, checkedItems, restored]);

  // 復元（初回のみ）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data?.v === 1) {
          setSelectedRecipe(data.selectedRecipe ?? null);
          setRecipeDetails(data.recipeDetails ?? null);
          setCheckedItems(data.checkedItems ?? {});
        }
      }
    } catch (_) {}
    setRestored(true);
  }, []);

  // メニュー生成中のローディング文言を3秒ごとに切り替え
  useEffect(() => {
    if (!isLoadingSuggestion) {
      setLoadingMsgIdx(0);
      return;
    }
    const id = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(id);
  }, [isLoadingSuggestion]);

  const handleFinishRecipe = () => {
    setSelectedRecipe(null);
    setRecipeDetails(null);
    setCheckedItems({});
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    window.scrollTo(0, 0);
  };

  // --- レシピ提案をリクエストする関数 ---
  const handleSuggestRecipes = async () => {
    setIsLoadingSuggestion(true);
    setErrorSuggestion('');
    setSuggestedRecipes([]);
    setSelectedRecipe(null);
    setRecipeDetails(null);

    try {
      const response = await fetch('/api/suggest-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRequest, pattern }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'レシピの提案に失敗しました。');
      }

      const data = await response.json();
      setSuggestedRecipes(data);

    } catch (err) {
      setErrorSuggestion(err.message);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // ★買い物リストのチェックボックスを切り替える関数★
  const handleCheckItem = (item) => {
    setCheckedItems((prev) => ({
      ...prev,
      [item]: !prev[item], // アイテム名をキーにして、チェック状態を反転させる
    }));
  };

  // --- レシピ詳細をリクエストする関数 ---
  const handleSelectRecipe = async (recipe) => {
    setSelectedRecipe(recipe);
    setRecipeDetails(null);
    setCheckedItems({}); // ★チェック状態をリセット
    setIsLoadingDetails(true);
    setErrorDetails('');
    window.scrollTo(0, 0);

    try {
      const response = await fetch('/api/generate-recipe-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedMenu: recipe,
          ingredientsList: [], // 食材リスト管理機能がないため空配列
        }),
      });

      if (!response.ok) throw new Error('レシピ詳細の生成に失敗しました。');

      const data = await response.json();
      setRecipeDetails(data);

    } catch (err) {
      setErrorDetails(err.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      
      {/* --- ★トップページのヘッダーセクション★ --- */}
      <header className="text-center mb-10">
        <TitleImage className="mb-2" />
        <div className="mt-6 flex justify-center">
          <Image 
            src="/image/chef_icon.png" // 画像パスを実ファイルに合わせて修正
            alt="レシピおまかせ君のキャラクター" 
            width={200}
            height={200}
            priority // 優先的に読み込む
          />
        </div>
      </header>

      {/* --- レシピ詳細表示セクション (変更なし) --- */}
      {selectedRecipe && (
        <section className="mb-8 p-6 border-2 border-green-500 rounded-lg shadow-lg bg-white/80 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-green-700">決定！今日の献立： {selectedRecipe.menu_name}</h2>
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleFinishRecipe}
              className="px-4 py-2 text-sm rounded-md border text-gray-600 hover:bg-gray-50"
            >
              レシピを終了する
            </button>
          </div>
          {isLoadingDetails && <p className="text-lg text-center">AIが買い物リストとレシピを作成中... 🧑‍🍳</p>}
          {errorDetails && <p className="text-red-500">{errorDetails}</p>}
          {recipeDetails && (
            <div className="space-y-8">
              {/* ★ここから買い物リストのUIを刷新★ */}
              <div>
                <h3 className="text-xl font-semibold mb-3 border-b pb-2">買い物リスト</h3>
                {recipeDetails.shopping_list.length > 0 ? (
                  <div className="space-y-2">
                    {recipeDetails.shopping_list.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`item-${index}`}
                          checked={!!checkedItems[item]}
                          onChange={() => handleCheckItem(item)}
                          className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <label 
                          htmlFor={`item-${index}`} 
                          className={`ml-3 text-gray-700 ${checkedItems[item] ? 'line-through text-gray-400' : ''}`}
                        >
                          {item}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">家に今ある食材で全部作れます！</p>
                )}
              </div>

              {/* ★ここから調理手順のUIを刷新★ */}
              <div>
                <h3 className="text-xl font-semibold mb-3 border-b pb-2">調理手順</h3>
                <div className="space-y-6">
                  {(() => {
                    const p = selectedRecipe.pattern || 'full_meal';
                    if (p === 'full_meal') {
                      return (
                        <>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800">主菜: {selectedRecipe?.dishes?.main}</h4>
                            <ol className="list-decimal list-inside space-y-2 mt-2 pl-4">
                              {(recipeDetails?.cooking_steps?.main || []).map((step, index) => (
                                <li key={`main-${index}`}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800">副菜: {selectedRecipe?.dishes?.side}</h4>
                            <ol className="list-decimal list-inside space-y-2 mt-2 pl-4">
                              {(recipeDetails?.cooking_steps?.side || []).map((step, index) => (
                                <li key={`side-${index}`}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800">汁物: {selectedRecipe?.dishes?.soup}</h4>
                            <ol className="list-decimal list-inside space-y-2 mt-2 pl-4">
                              {(recipeDetails?.cooking_steps?.soup || []).map((step, index) => (
                                <li key={`soup-${index}`}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        </>
                      );
                    }
                    if (p === 'one_bowl') {
                      return (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">一品: {selectedRecipe?.dishes?.single}</h4>
                          <ol className="list-decimal list-inside space-y-2 mt-2 pl-4">
                            {(recipeDetails?.cooking_steps?.single || []).map((step, index) => (
                              <li key={`single-${index}`}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      );
                    }
                    if (p === 'one_plate') {
                      return (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">ワンプレート: {selectedRecipe?.dishes?.plate}</h4>
                          <ol className="list-decimal list-inside space-y-2 mt-2 pl-4">
                            {(recipeDetails?.cooking_steps?.plate || []).map((step, index) => (
                              <li key={`plate-${index}`}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      );
                    }
                    if (p === 'bento') {
                      const items = selectedRecipe?.dishes?.items || [];
                      const stepsList = recipeDetails?.cooking_steps?.items || [];
                      return (
                        <div className="space-y-6">
                          {items.map((name, idx) => (
                            <div key={`item-${idx}`}>
                              <h4 className="text-lg font-semibold text-gray-800">{name}</h4>
                              <ol className="list-decimal list-inside space-y-2 mt-2 pl-4">
                                {(stepsList[idx] || []).map((step, si) => (
                                  <li key={`item-${idx}-step-${si}`}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* --- AI提案セクション (★ボタンの色を変更★) --- */}
      <section className="mb-8 p-6 border rounded-lg shadow-md bg-white/80 backdrop-blur-sm">
        <h2 className="text-2xl font-semibold mb-4">どんなメニューがいい？</h2>
        <div className="space-y-4">
          {/* パターン選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">献立パターン</label>
            <select
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white"
            >
              <option value="full_meal">しっかり一食（主菜・副菜・汁物）</option>
              <option value="one_bowl">一品で満足！どんぶり・麺類</option>
              <option value="one_plate">カフェ風ワンプレートランチ</option>
              <option value="bento">品数豊富なお弁当</option>
            </select>
          </div>
          <textarea
            value={userRequest}
            onChange={(e) => setUserRequest(e.target.value)}
            placeholder="今日の気分や追加の要望を入力してください。(例: あっさりした和食が食べたい、15分以内で作れるものがいい)"
            className="w-full h-24 p-2 border border-gray-300 rounded-md shadow-sm"
          />
          <button
            onClick={handleSuggestRecipes}
            disabled={isLoadingSuggestion}
            className="w-full px-4 py-3 bg-brand-orange text-white font-bold rounded-md shadow-sm hover:bg-brand-orange-dark disabled:bg-gray-400"
          >
            {isLoadingSuggestion ? LOADING_MESSAGES[loadingMsgIdx] : '最適なレシピを提案してもらう！'}
          </button>
          {errorSuggestion && <p className="text-red-500 mt-2">{errorSuggestion}</p>}
        </div>
      </section>

      {/* --- レシピ提案結果 (★ボタンの色を変更★) --- */}
      {suggestedRecipes.length > 0 && (
        <section className="mb-8 p-6 rounded-lg bg-green-50/80 backdrop-blur-sm">
          <h2 className="text-2xl font-semibold mb-4">AIからの献立提案</h2>
          <div className="space-y-4">
            {suggestedRecipes.map((recipe, index) => (
              <div key={index} className="flex flex-col justify-between border p-4 rounded-md bg-white shadow">
                <div>
                  <span className="inline-block mb-1 px-3 py-1 rounded-full bg-brand-orange text-white text-xs font-bold">
                    {`🍽️ ${index + 1}つ目のご提案！`}
                  </span>
                  <h3 className="text-lg font-bold text-green-800">{recipe.menu_name}</h3>
                  {/* 提案コメント */}
                  {recipe.comment && (
                    <div className="mt-2 relative">
                      <div className="inline-block max-w-full bg-green-50 border border-green-200 text-gray-800 rounded-xl px-3 py-2 shadow-sm">
                        <span className="text-sm">{recipe.comment}</span>
                      </div>
                      <span className="absolute -left-1 top-3 w-3 h-3 bg-green-50 border-l border-t border-green-200 rotate-45"></span>
                    </div>
                  )}
                  {/* パターン別の表示 */}
                  {(() => {
                    const p = recipe.pattern || pattern;
                    if (p === 'full_meal') {
                      return (
                        <ul className="mt-2 text-sm list-disc list-inside">
                          <li><strong>主菜:</strong> {recipe?.dishes?.main}</li>
                          <li><strong>副菜:</strong> {recipe?.dishes?.side}</li>
                          <li><strong>汁物:</strong> {recipe?.dishes?.soup}</li>
                        </ul>
                      );
                    }
                    if (p === 'one_bowl') {
                      return (
                        <p className="mt-2 text-sm"><strong>一品:</strong> {recipe?.dishes?.single}</p>
                      );
                    }
                    if (p === 'one_plate') {
                      return (
                        <p className="mt-2 text-sm"><strong>ワンプレート:</strong> {recipe?.dishes?.plate}</p>
                      );
                    }
                    if (p === 'bento') {
                      const items = recipe?.dishes?.items || [];
                      return (
                        <div className="mt-2 text-sm">
                          <p className="font-semibold">お弁当おかず</p>
                          <ul className="list-disc list-inside">
                            {items.map((it, i) => (
                              <li key={i}>{it}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {/* 栄養素 */}
                  {recipe.nutrients && (
                    <div className="mt-3 text-sm">
                      {recipe.nutrients.summary && (
                        <p className="mb-1"><strong>この一食の目安栄養素:</strong> {recipe.nutrients.summary}</p>
                      )}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {recipe.nutrients.energy && <p><strong>エネルギー:</strong> {recipe.nutrients.energy}</p>}
                        {recipe.nutrients.protein && <p><strong>たんぱく質:</strong> {recipe.nutrients.protein}</p>}
                        {recipe.nutrients.fat && <p><strong>脂質:</strong> {recipe.nutrients.fat}</p>}
                        {recipe.nutrients.carbohydrates && <p><strong>炭水化物:</strong> {recipe.nutrients.carbohydrates}</p>}
                        {recipe.nutrients.salt_equivalent && <p><strong>塩分相当量:</strong> {recipe.nutrients.salt_equivalent}</p>}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleSelectRecipe(recipe)}
                  className="mt-4 w-full px-3 py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600"
                >
                  このレシピに決める！
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}