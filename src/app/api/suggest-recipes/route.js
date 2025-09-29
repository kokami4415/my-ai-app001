// src/app/api/suggest-recipes/route.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(request) {
  let familyMembers, ingredients; // tryの外で変数を宣言
  let rawAiResponseText = '';

  try {
    // --- -1. 環境変数チェック ---
    if (!process.env.GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY が未設定です');
      return Response.json({ error: 'サーバー設定エラー: APIキー未設定' }, { status: 500 });
    }
    // --- 0. サーバー用Supabaseクライアント＆ユーザー取得 ---
    const supabase = await createSupabaseServerClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: '未認証' }, { status: 401 });

    // --- 1. データベースからユーザー自身の情報を取得 ---
    const { data: familyData, error: familyError } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id);
    if (familyError) throw new Error(`家族情報の取得失敗: ${familyError.message}`);
    familyMembers = familyData || [];

    const { data: ingredientsData, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('name')
      .eq('user_id', user.id);
    if (ingredientsError) throw new Error(`食材リストの取得失敗: ${ingredientsError.message}`);
    ingredients = ingredientsData || [];

    // --- 2. フロントエンドからの追加要望とパターンを取得 ---
    const body = await request.json();
    const userRequest = body.userRequest || '特にありません';
    const pattern = body.pattern || 'full_meal'; // 後方互換のためデフォルト

    // --- 3. ★プロンプトを強化★ ---
    const ingredientsList = ingredients.map(ing => ing.name).join(', ') || 'なし';

    // --- パターン別の仕様定義 ---
    const patternSpecs = {
      full_meal: {
        title: 'しっかり一食（主菜・副菜・汁物）',
        rules: [
          '各献立は「主菜」「副菜」「汁物」で構成する',
        ],
        jsonShape: `[
  {
    "menu_name": "献立名A",
    "pattern": "full_meal",
    "dishes": { "main": "主菜名", "side": "副菜名", "soup": "汁物名" },
    "comment": "家族情報や要望を踏まえた楽しい提案コメント（絵文字入り）",
    "cooking_time": "約xx分",
    "nutrients": {
      "summary": "この一食の目安栄養素の説明",
      "energy": "xxx kcal",
      "protein": "xx g",
      "fat": "xx g",
      "carbohydrates": "xx g",
      "salt_equivalent": "x.x g"
    }
  }
]`
      },
      one_bowl: {
        title: '一品で満足！どんぶり・麺類',
        rules: [
          'どんぶり、麺類、ワンボウルで完結する主食系の一品料理に限定する',
        ],
        jsonShape: `[
  {
    "menu_name": "メニュー名A",
    "pattern": "one_bowl",
    "dishes": { "single": "どんぶり/麺類の料理名" },
    "comment": "家族情報や要望を踏まえた楽しい提案コメント（絵文字入り）",
    "cooking_time": "約xx分",
    "nutrients": {
      "summary": "この一食の目安栄養素の説明",
      "energy": "xxx kcal",
      "protein": "xx g",
      "fat": "xx g",
      "carbohydrates": "xx g",
      "salt_equivalent": "x.x g"
    }
  }
]`
      },
      one_plate: {
        title: 'カフェ風ワンプレートランチ',
        rules: [
          '1つの皿で見た目も楽しめる盛り付けを意識する',
          '主食＋主菜＋副菜を1皿にまとめても良い',
        ],
        jsonShape: `[
  {
    "menu_name": "プレート名A",
    "pattern": "one_plate",
    "dishes": { "plate": "プレートの内容（例: タコライス、サラダ、スープ付き など）" },
    "comment": "家族情報や要望を踏まえた楽しい提案コメント（絵文字入り）",
    "cooking_time": "約xx分",
    "nutrients": {
      "summary": "この一食の目安栄養素の説明",
      "energy": "xxx kcal",
      "protein": "xx g",
      "fat": "xx g",
      "carbohydrates": "xx g",
      "salt_equivalent": "x.x g"
    }
  }
]`
      },
      bento: {
        title: '品数豊富なお弁当',
        rules: [
          '持ち運びやすく冷めても美味しいおかずを中心に構成する',
          'メイン1品＋副菜2-3品＋彩りを意識する',
        ],
        jsonShape: `[
  {
    "menu_name": "お弁当名A",
    "pattern": "bento",
    "dishes": { "items": ["おかず1", "おかず2", "おかず3"] },
    "comment": "家族情報や要望を踏まえた楽しい提案コメント（絵文字入り）",
    "cooking_time": "約xx分",
    "nutrients": {
      "summary": "この一食の目安栄養素の説明",
      "energy": "xxx kcal",
      "protein": "xx g",
      "fat": "xx g",
      "carbohydrates": "xx g",
      "salt_equivalent": "x.x g"
    }
  }
]`
      }
    };

    const spec = patternSpecs[pattern] || patternSpecs.full_meal;

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

      ## 献立パターン
      - コード: ${pattern}
      - タイトル: ${spec.title}

      ## 命令
      上記の情報をすべて考慮し、指定のパターン(${spec.title})に適合するおすすめの献立を3つ提案してください。

      ### 厳格なルール
      - **最重要:** 出力は必ず指定されたJSON形式の配列のみとし、前後の説明文、マークダウン(\`\`\`)、その他のテキストは一切含めないでください。
      - 家族の嫌いな食材は絶対に使用しないでください。
      - 現在ある食材をなるべく活用してください。
      - 以下のパターン固有ルールを必ず守ってください:
        ${spec.rules.map(r => `- ${r}`).join('\n        ')}
      - 家族全員の栄養バランスを考慮してください。

      ### 提案コメントの要件
      - 各献立に「comment」を含め、依頼内容(${userRequest})や家族情報を踏まえた楽しく親しみやすい文章にしてください。
      - 絵文字をほどよく使ってください（例: 🍚🥗🍜✨）。
      - 2〜3文、約40〜80文字を目安にしてください。
      
      ### 調理時間の要件
      - 各献立に「cooking_time」を含め、全体の目安調理時間（例: 約20分）を日本語で簡潔に記載してください。

      ### JSON形式
      ${spec.jsonShape}
    `;

    // --- 4. AIにリクエストを送信 ---
    // 複数モデルへのフォールバック（404/未サポート時）
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro-002',
      'gemini-1.0-pro',
    ];
    let text;
    let chosenModel = '';
    let lastModelError;
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' },
        });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
        chosenModel = modelName;
        break;
      } catch (e) {
        lastModelError = e;
        const msg = String(e?.message || e);
        const retriable = /not found|not supported|404/i.test(msg);
        if (!retriable) throw e;
      }
    }
    if (!text) {
      throw lastModelError || new Error('Geminiモデルの呼び出しに失敗しました。');
    }
    rawAiResponseText = text;
    console.log('[suggest-recipes] 使用モデル:', chosenModel);

    // --- 5. ★AI応答のクリーニングとパース処理を強化★ ---
    let jsonText = text ?? '';
    // フェンス多様性に対応
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      jsonText = fenceMatch[1];
    } else {
      const start = jsonText.indexOf('[');
      const end = jsonText.lastIndexOf(']');
      if (start !== -1 && end > start) {
        jsonText = jsonText.slice(start, end + 1);
      }
    }
    jsonText = jsonText.trim();
    const recipes = JSON.parse(jsonText);
    // 後方互換のための正規化
    const normalized = Array.isArray(recipes)
      ? recipes.map(r => {
          const patched = { ...r };
          // pattern補完
          if (!patched.pattern) patched.pattern = pattern;
          // comment補完
          if (!patched.comment) {
            if (patched.nutrition_info) patched.comment = `栄養ポイント: ${patched.nutrition_info} ✨`;
            else patched.comment = '';
          }
          // cooking_time補完
          if (!patched.cooking_time) {
            patched.cooking_time = '';
          }
          // nutrients補完
          if (!patched.nutrients) {
            patched.nutrients = {
              summary: patched.nutrition_info || '',
              energy: patched.estimated_calories || '',
              protein: '',
              fat: '',
              carbohydrates: '',
              salt_equivalent: '',
            };
          } else {
            // energyがなければestimated_caloriesを転記
            if (!patched.nutrients.energy && patched.estimated_calories) {
              patched.nutrients.energy = patched.estimated_calories;
            }
            if (!patched.nutrients.summary && patched.nutrition_info) {
              patched.nutrients.summary = patched.nutrition_info;
            }
          }
          return patched;
        })
      : [];

    // 6. 履歴をSupabaseに保存
    const { error: historyError } = await supabase
      .from('recipe_history')
      .insert([
        { 
          user_id: user.id,
          user_request: userRequest,
          ai_response: recipes
        },
      ]);

    if (historyError) {
      // ここでエラーが出てもフロントにはレシピを返すことを優先し、
      // サーバー側でのみエラーを記録する
      console.error('レシピ履歴の保存に失敗しました:', historyError);
    }

    // 7. フロントエンドにレシピを返す (変更なし)
    return Response.json(normalized);

  } catch (error) {
    // --- ★エラーログを詳細化★ ---
    console.error('詳細なレシピ提案エラー:', {
      message: error.message,
      stack: error.stack,
      aiResponseText: rawAiResponseText,
    });

    // データベースの情報もログに出力
    console.error('エラー発生時のDB情報:', { familyMembers, ingredients });

    return Response.json({ error: 'レシピの提案中にエラーが発生しました。詳細はサーバーログを確認してください。' }, { status: 500 });
  }
}