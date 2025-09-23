// src/app/api/suggest-recipes/route.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(request) {
  let familyMembers, ingredients; // tryの外で変数を宣言

  try {
    // --- 1. データベースから全情報を取得 ---
    // (この部分は変更なし)
    const { data: familyData, error: familyError } = await supabase.from('family_members').select('*');
    if (familyError) throw new Error(`家族情報の取得失敗: ${familyError.message}`);
    familyMembers = familyData;

    const { data: ingredientsData, error: ingredientsError } = await supabase.from('ingredients').select('name');
    if (ingredientsError) throw new Error(`食材リストの取得失敗: ${ingredientsError.message}`);
    ingredients = ingredientsData;

    // --- 2. フロントエンドからの追加要望を取得 ---
    // (この部分は変更なし)
    const body = await request.json();
    const userRequest = body.userRequest || '特にありません';

    // --- 3. ★プロンプトを強化★ ---
    const ingredientsList = ingredients.map(ing => ing.name).join(', ') || 'なし';

    const prompt = `
      ## 役割
      あなたはプロの栄養士兼シェフです。JSON形式でデータを返すAPIとして機能してください。

      ## データベース情報
      ### 家族構成
      ${familyMembers.map(m => `- ${m.name} (${m.gender}, ${m.age}歳, ${m.height}cm, ${m.weight}kg) 嫌いなもの: ${m.dislikes}`).join('\n')}
      ### 現在ある食材
      ${ingredientsList}

      ## ユーザーからの追加要望
      ${userRequest}

      ## 命令
      上記の情報をすべて考慮し、おすすめの献立を3つ提案してください。

      ### 厳格なルール
      - **最重要:** 出力は必ず指定されたJSON形式の配列のみとし、前後の説明文、マークダウン(\`\`\`)、その他のテキストは一切含めないでください。
      - 家族の嫌いな食材は絶対に使用しないでください。
      - 現在ある食材をなるべく活用してください。
      - 各献立は「主菜」「副菜」「汁物」で構成してください。
      - 家族全員の栄養バランスを考慮してください。

      ### JSON形式
      [
        {
          "menu_name": "献立名A",
          "dishes": { "main": "主菜名", "side": "副菜名", "soup": "汁物名" },
          "estimated_calories": "献立全体の推定カロリー",
          "nutrition_info": "簡単な栄養素情報"
        },
        // ... (同様にあと2つ)
      ]
    `;

    // --- 4. AIにリクエストを送信 ---
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // --- 5. ★AI応答のクリーニングとパース処理を強化★ ---
    let jsonText = text;
    
    // AIが返しがちなマークダウンブロックを除去
    const markdownMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch) {
      jsonText = markdownMatch[1];
    }
    
    // それでも残る可能性のある前後の不要な空白や改行をトリム
    jsonText = jsonText.trim();
    
    // JSONとしてパース
    const recipes = JSON.parse(jsonText);

    // 6. 履歴をSupabaseに保存
    const { error: historyError } = await supabase
      .from('recipe_history')
      .insert([
        { 
          user_request: userRequest, // ユーザーの要望
          ai_response: recipes       // AIが生成したJSONデータ
        },
      ]);

    if (historyError) {
      // ここでエラーが出てもフロントにはレシピを返すことを優先し、
      // サーバー側でのみエラーを記録する
      console.error('レシピ履歴の保存に失敗しました:', historyError);
    }

    // 7. フロントエンドにレシピを返す (変更なし)
    return Response.json(recipes);

  } catch (error) {
    // --- ★エラーログを詳細化★ ---
    console.error('詳細なレシピ提案エラー:', {
      message: error.message,
      stack: error.stack,
      // AIからの生の応答テキストもログに出力すると、原因究明に非常に役立つ
      // aiResponseText: text, // 'text'が未定義の場合があるので、スコープを考慮する必要がある
    });

    // データベースの情報もログに出力
    console.error('エラー発生時のDB情報:', { familyMembers, ingredients });

    return Response.json({ error: 'レシピの提案中にエラーが発生しました。詳細はサーバーログを確認してください。' }, { status: 500 });
  }
}