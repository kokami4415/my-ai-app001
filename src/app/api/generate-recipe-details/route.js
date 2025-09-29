// src/app/api/generate-recipe-details/route.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(request) {
  let rawAiResponseText = ''; // AIからの生の応答を保存する変数

  try {
    // --- 0. 環境変数チェック ---
    if (!process.env.GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY が未設定です');
      return Response.json({ error: 'サーバー設定エラー: APIキー未設定' }, { status: 500 });
    }
    // 家族人数を取得して想定人数を決める
    let servingsLabel = '1人前';
    try {
      const supabase = await createSupabaseServerClient(request);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: familyData } = await supabase
          .from('family_members')
          .select('id')
          .eq('user_id', user.id);
        const count = Array.isArray(familyData) ? familyData.length : 0;
        if (count > 0) servingsLabel = `${count}人前`;
      }
    } catch (_) {}
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
  "ingredients": {
    "main": ["主菜の材料1", "主菜の材料2"],
    "side": ["副菜の材料1"],
    "soup": ["汁物の材料1"]
  },
  "cooking_steps": {
    "main": [{"step": "主菜のステップ1", "time": "5分", "heat": "中火"}],
    "side": [{"step": "副菜のステップ1", "time": "3分", "heat": "弱火"}],
    "soup": [{"step": "汁物のステップ1", "time": "4分", "heat": "強火"}]
  }
}`
      },
      one_bowl: {
        header: `- 一品: ${selectedMenu?.dishes?.single}`,
        json: `{
  "shopping_list": ["品目1 (数量)"],
  "ingredients": { "single": ["材料1", "材料2"] },
  "cooking_steps": {
    "single": [{"step": "一品料理のステップ1", "time": "5分", "heat": "中火"}]
  }
}`
      },
      one_plate: {
        header: `- ワンプレート: ${selectedMenu?.dishes?.plate}`,
        json: `{
  "shopping_list": ["品目1 (数量)"],
  "ingredients": { "plate": ["材料1", "材料2"] },
  "cooking_steps": {
    "plate": [{"step": "下準備", "time": "5分", "heat": "-"}, {"step": "盛り付け", "time": "3分", "heat": "-"}]
  }
}`
      },
      bento: {
        header: `- お弁当おかず: ${(selectedMenu?.dishes?.items || []).join(', ')}`,
        json: `{
  "shopping_list": ["品目1 (数量)"],
  "ingredients": { "items": [["おかず1材料1"],["おかず2材料1"]] },
  "cooking_steps": {
    "items": [[{"step": "おかず1の手順1", "time": "5分", "heat": "中火"}], [{"step": "おかず2の手順1", "time": "3分", "heat": "弱火"}]]
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
      上記の情報を基に、「買い物リスト」と「調理手順」を生成してください。想定人数は「${servingsLabel}」です。材料の量や工程の記述はこの人数を前提にしてください。

      ### 厳格なルール
      - **最重要:** 出力は必ず指定されたJSON形式のみとし、前後の説明文、マークダウン(\`\`\`)、その他のテキストは一切含めないでください。
      - 買い物リスト(shopping_list)は、献立を作る上で不足している食材と量をリストアップしてください。家に今ある食材で足りる場合は、空の配列 \`[]\` を返してください。

      ### 2. 調理手順 (cooking_steps)
      - 指定されたパターン(${pattern})に合わせたキー構成で返してください。
      - 例: full_mealなら main/side/soup、one_bowlなら single、one_plateなら plate、bentoなら items。
      - 各ステップはオブジェクトで、\`step\`（手順の説明）, \`time\`（目安時間）, \`heat\`（火加減: 強火/中火/弱火または不要なら"-"）を含めてください。

      ### 3. 各料理ごとの材料 (ingredients)
      - 各料理（またはおかず）に必要な材料リストを配列で返してください。

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

    // 簡易JSON修復: 配列内の未クォート値や要素間カンマ欠落を補正
    const repairJsonLoose = (text) => {
      let t = text;
      // 0) 制御文字の無害化（改行/タブ以外の制御文字は空白に）
      t = t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
      // 1) 改行行で未クォートの配列要素をクォート化
      //    例: \n    充電ケーブル\n  -> \n    "充電ケーブル"\n
      t = t.replace(/\n(\s*)([^"\[\]\{\},\s][^\n\],]*)\s*(?=(,|\]|\n))/g, (m, sp, val) => `\n${sp}"${val.trim()}"`);
      // 2) 隣接する文字列要素の間にカンマを補完
      //    例: "..."\n  "..." -> "...",\n  "..."
      t = t.replace(/"(\s*\n\s*)"/g, '",$1"');
      // 3) 配列内の孤立した '",' を修正（空文字+カンマ化）もしくは削除
      //    例: \n    ",\n  -> \n    ,\n
      t = t.replace(/\n(\s*)",\s*\n/g, (m, sp) => `\n${sp},\n`);
      // 4) 行末が '"' で次行が ']' の場合はカンマを付けない。それ以外で必要なら軽微に補正
      t = t.replace(/"\s*(\n\s*)([^\]\},])/g, '",$1$2');
      return t;
    };

    let recipeDetails;
    try {
      recipeDetails = JSON.parse(jsonText);
    } catch (_) {
      const repaired = repairJsonLoose(jsonText);
      recipeDetails = JSON.parse(repaired);
    }
    // 人数情報を付加（未設定なら）
    if (recipeDetails && !recipeDetails.servings) {
      recipeDetails.servings = servingsLabel;
    }
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