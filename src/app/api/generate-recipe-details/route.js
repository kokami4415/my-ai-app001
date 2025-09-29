// src/app/api/generate-recipe-details/route.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(request) {
  let rawAiResponseText = ''; // AIからの生の応答を保存する変数

  try {
    // --- 0. 環境変数チェック ---
    if (!process.env.GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY が未設定です');
      return Response.json({ error: 'サーバー設定エラー: APIキー未設定' }, { status: 500 });
    }
    // --- 1. フロントエンドからの情報を受け取る (変更なし) ---
    const body = await request.json();
    const { selectedMenu, ingredientsList } = body;
    const pattern = selectedMenu?.pattern || 'full_meal'; // 後方互換のためデフォルト
    if (!selectedMenu || !ingredientsList) {
      return Response.json({ error: '必要な情報が不足しています。' }, { status: 400 });
    }

    // --- 2. ★プロンプトを強化★ ---
    // パターン別の詳細生成仕様
    const stepsShapeByPattern = {
      full_meal: {
        header: `- 主菜: ${selectedMenu.dishes.main}\n- 副菜: ${selectedMenu.dishes.side}\n- 汁物: ${selectedMenu.dishes.soup}`,
        json: `{
  "shopping_list": ["品目1 (数量)", "品目2 (数量)"],
  "cooking_steps": {
    "main": ["主菜のステップ1", "主菜のステップ2"],
    "side": ["副菜のステップ1"],
    "soup": ["汁物のステップ1"]
  }
}`
      },
      one_bowl: {
        header: `- 一品: ${selectedMenu?.dishes?.single}`,
        json: `{
  "shopping_list": ["品目1 (数量)"],
  "cooking_steps": {
    "single": ["一品料理のステップ1", "一品料理のステップ2"]
  }
}`
      },
      one_plate: {
        header: `- ワンプレート: ${selectedMenu?.dishes?.plate}`,
        json: `{
  "shopping_list": ["品目1 (数量)"],
  "cooking_steps": {
    "plate": ["ワンプレートの下準備", "盛り付けのポイント"]
  }
}`
      },
      bento: {
        header: `- お弁当おかず: ${(selectedMenu?.dishes?.items || []).join(', ')}`,
        json: `{
  "shopping_list": ["品目1 (数量)"],
  "cooking_steps": {
    "items": [["おかず1の手順1", "おかず1の手順2"], ["おかず2の手順1"]]
  }
}`
      }
    };

    const stepsSpec = stepsShapeByPattern[pattern] || stepsShapeByPattern.full_meal;

    const prompt = `
      ## 役割
      あなたはJSON形式でデータを返すAPIとして機能する、プロの料理研究家です。

      ## 与えられた情報
      ### 作る献立
      ${stepsSpec.header}
      ### 現在家にある食材
      ${ingredientsList.join(', ')}

      ## 命令
      上記の情報を基に、「買い物リスト」と「調理手順」を生成してください。

      ### 厳格なルール
      - **最重要:** 出力は必ず指定されたJSON形式のみとし、前後の説明文、マークダウン(\`\`\`)、その他のテキストは一切含めないでください。
      - 買い物リスト(shopping_list)は、献立を作る上で不足している食材と量をリストアップしてください。家に今ある食材で足りる場合は、空の配列 \`[]\` を返してください。

      ### 2. 調理手順 (cooking_steps)
      - 指定されたパターン(${pattern})に合わせたキー構成で返してください。
      - 例: full_mealなら main/side/soup、one_bowlなら single、one_plateなら plate、bentoなら items。
      - 各料理（またはおかず）の手順は、配列で返してください。bentoの items は各おかずごとに配列の配列にしてください。

      ### JSON形式
      ${stepsSpec.json}
    `;

    // --- 3. AIにリクエストを送信 (JSON固定出力) ---
    // 複数モデルへのフォールバック
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro-002',
      'gemini-1.0-pro',
    ];
    let chosenModel = '';
    let lastModelError;
    let response;
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' },
        });
        const result = await model.generateContent(prompt);
        response = await result.response;
        chosenModel = modelName;
        break;
      } catch (e) {
        lastModelError = e;
        const msg = String(e?.message || e);
        const retriable = /not found|not supported|404/i.test(msg);
        if (!retriable) throw e;
      }
    }
    if (!response) {
      throw lastModelError || new Error('Geminiモデルの呼び出しに失敗しました。');
    }
    rawAiResponseText = response.text();
    console.log('[generate-recipe-details] 使用モデル:', chosenModel);

    // --- 4. ★AI応答のクリーニングとパース処理を強化★ ---
    let jsonText = rawAiResponseText ?? '';
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      jsonText = fenceMatch[1];
    } else {
      const start = jsonText.indexOf('{');
      const end = jsonText.lastIndexOf('}');
      if (start !== -1 && end > start) {
        jsonText = jsonText.slice(start, end + 1);
      }
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