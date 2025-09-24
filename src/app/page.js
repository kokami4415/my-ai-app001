// src/app/page.js

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image'; // Next.jsの画像コンポーネント

export default function HomePage() {
  const router = useRouter();
  // --- AI提案機能のState ---
  const [userRequest, setUserRequest] = useState(''); // ユーザーの追加要望
  const [suggestedRecipes, setSuggestedRecipes] = useState([]); // 提案されたレシピのリスト
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [errorSuggestion, setErrorSuggestion] = useState('');

  // レシピ詳細機能のState
  const [selectedRecipe, setSelectedRecipe] = useState(null); // ユーザーが選んだレシピ
  const [recipeDetails, setRecipeDetails] = useState(null); // AIが生成したレシピ詳細
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');
  const [checkedItems, setCheckedItems] = useState({}); // ★買い物リストのチェック状態を管理

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
        body: JSON.stringify({ userRequest }),
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
        <div className="flex flex-col items-center mb-2">
          <Image
            src="/image/recipe_title.png"
            alt="レシピおまかせ君 タイトル画像"
            width={400}
            height={80}
            priority
            className="mb-2"
          />
        </div>
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
                  {/* 主菜 */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">主菜: {selectedRecipe.dishes.main}</h4>
                    <ol className="list-decimal list-inside space-y-2 mt-2 pl-4">
                      {recipeDetails.cooking_steps.main.map((step, index) => (
                        <li key={`main-${index}`}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  {/* 副菜 */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">副菜: {selectedRecipe.dishes.side}</h4>
                    <ol className="list-decimal list-inside space-y-2 mt-2 pl-4">
                      {recipeDetails.cooking_steps.side.map((step, index) => (
                        <li key={`side-${index}`}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  {/* 汁物 */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">汁物: {selectedRecipe.dishes.soup}</h4>
                    <ol className="list-decimal list-inside space-y-2 mt-2 pl-4">
                      {recipeDetails.cooking_steps.soup.map((step, index) => (
                        <li key={`soup-${index}`}>{step}</li>
                      ))}
                    </ol>
                  </div>
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
            {isLoadingSuggestion ? '考え中...' : '最適なレシピを提案してもらう！'}
          </button>
          {errorSuggestion && <p className="text-red-500 mt-2">{errorSuggestion}</p>}
        </div>
      </section>

      {/* --- レシピ提案結果 (★ボタンの色を変更★) --- */}
      {suggestedRecipes.length > 0 && (
        <section className="mb-8 p-6 rounded-lg bg-green-50/80 backdrop-blur-sm">
          <h2 className="text-2xl font-semibold mb-4">AIからの献立提案</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestedRecipes.map((recipe, index) => (
              <div key={index} className="flex flex-col justify-between border p-4 rounded-md bg-white shadow">
                <div>
                  <h3 className="text-lg font-bold text-green-800">{recipe.menu_name}</h3>
                  <ul className="mt-2 text-sm list-disc list-inside">
                    <li><strong>主菜:</strong> {recipe.dishes.main}</li>
                    <li><strong>副菜:</strong> {recipe.dishes.side}</li>
                    <li><strong>汁物:</strong> {recipe.dishes.soup}</li>
                  </ul>
                  <p className="mt-3 text-sm"><strong>カロリー:</strong> {recipe.estimated_calories}</p>
                  <p className="mt-1 text-sm"><strong>栄養情報:</strong> {recipe.nutrition_info}</p>
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