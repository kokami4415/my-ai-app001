// src/app/api/generate-recipe-details/route.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(request) {
  let rawAiResponseText = ''; // AIからの生の応答を保存する変数

  try {
    // --- 1. フロントエンドからの情報を受け取る (変更なし) ---
    const body = await request.json();
    const { selectedMenu, ingredientsList } = body;
    if (!selectedMenu || !ingredientsList) {
      return Response.json({ error: '必要な情報が不足しています。' }, { status: 400 });
    }

    // --- 2. ★プロンプトを強化★ ---
    const prompt = `
      ## 役割
      あなたはJSON形式でデータを返すAPIとして機能する、プロの料理研究家です。

      ## 与えられた情報
      ### 作る献立
      - 主菜: ${selectedMenu.dishes.main}
      - 副菜: ${selectedMenu.dishes.side}
      - 汁物: ${selectedMenu.dishes.soup}
      ### 現在家にある食材
      ${ingredientsList.join(', ')}

      ## 命令
      上記の情報を基に、「買い物リスト」と「調理手順」を生成してください。

      ### 厳格なルール
      - **最重要:** 出力は必ず指定されたJSON形式のみとし、前後の説明文、マークダウン(\`\`\`)、その他のテキストは一切含めないでください。
      - 買い物リスト(shopping_list)は、献立を作る上で不足している食材と量をリストアップしてください。家に今ある食材で足りる場合は、空の配列 \`[]\` を返してください。

      ### 2. 調理手順 (cooking_steps)
      - **主菜、副菜、汁物、それぞれの手順を分けて**、ステップバイステップで説明してください。
      - 各料理の手順は、文字列の配列としてください。

      ### JSON形式
      {
        "shopping_list": [
          "品目1 (数量)",
          "品目2 (数量)"
        ],
        "cooking_steps": {
          "main": [
            "主菜のステップ1: ...",
            "主菜のステップ2: ..."
          ],
          "side": [
            "副菜のステップ1: ..."
          ],
          "soup": [
            "汁物のステップ1: ..."
          ]
        }
      }
    `;

    // --- 3. AIにリクエストを送信 (変更なし) ---
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    rawAiResponseText = response.text(); // ★生の応答を保存

    // --- 4. ★AI応答のクリーニングとパース処理を強化★ ---
    let jsonText = rawAiResponseText;
    
    const markdownMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch) {
      jsonText = markdownMatch[1];
    }
    
    jsonText = jsonText.trim();
    
    const recipeDetails = JSON.parse(jsonText);
    return Response.json(recipeDetails);

  } catch (error) {
    // --- 5. ★エラーログを詳細化★ ---
    console.error('詳細なレシピ詳細生成エラー:', {
      message: error.message,
      // AIが実際に返してきた生のテキストをログに出力する
      aiResponseText: rawAiResponseText,
    });
    return Response.json({ error: 'レシピ詳細の生成中にエラーが発生しました。詳細はサーバーログを確認してください。' }, { status: 500 });
  }
}