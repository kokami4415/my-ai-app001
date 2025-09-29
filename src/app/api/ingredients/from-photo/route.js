// src/app/api/ingredients/from-photo/route.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(request) {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY が未設定です');
      return Response.json({ error: 'サーバー設定エラー: APIキー未設定' }, { status: 500 });
    }

    const supabase = await createSupabaseServerClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: '未認証' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return Response.json({ error: '画像ファイルが見つかりません。' }, { status: 400 });
    }

    const mimeType = file.type || 'image/jpeg';
    const size = file.size || 0;
    const MAX_SIZE = 8 * 1024 * 1024; // 8MB
    if (size <= 0 || size > MAX_SIZE) {
      return Response.json({ error: 'ファイルサイズが不正です（最大8MB）。' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    const prompt = `
      ## 役割
      あなたは画像から食品・食材を認識し、JSONで返すAPIです。

      ## 指示
      - 画像に写っている「食材・食品」の候補を抽出してください。
      - 結果は必ず配列のJSONで返してください。
      - 各要素は以下の形式とします:
        {
          "name": "食材名（日本語、一般名称。例: 玉ねぎ, 牛乳, 卵）",
          "category": "肉・魚 | 野菜・果物 | 調味料 | その他 のいずれか",
          "maybe": true/false // 不確かならtrue
        }
      - 同じものが複数写っていても重複させずユニークにまとめてください。
      - 製品名が写っている場合は一般的な食材名に正規化してください（例: "キッコーマンしょうゆ" → "しょうゆ"）。
      - 出力はJSONのみ。前後に説明やマークダウンを含めないでください。
    `;

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro-002',
      'gemini-1.0-pro',
    ];

    let responseText = '';
    let lastModelError;
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' },
        });
        const result = await model.generateContent([
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } },
        ]);
        const res = await result.response;
        responseText = res.text();
        break;
      } catch (e) {
        lastModelError = e;
        const msg = String(e?.message || e);
        const retriable = /not found|not supported|404/i.test(msg);
        if (!retriable) throw e;
      }
    }
    if (!responseText) throw lastModelError || new Error('Geminiモデルの呼び出しに失敗しました。');

    // クリーニング
    let jsonText = responseText ?? '';
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) jsonText = fenceMatch[1];
    jsonText = jsonText.trim();
    let items = [];
    try {
      items = JSON.parse(jsonText);
    } catch (e) {
      console.error('[from-photo] JSON parse error', e, jsonText.slice(0, 500));
      return Response.json({ error: '画像解析の結果を読み取れませんでした。' }, { status: 500 });
    }

    // 正規化
    const CATEGORY_MAP = new Map([
      ['肉', '肉・魚'], ['魚', '肉・魚'], ['魚介', '肉・魚'],
      ['野菜', '野菜・果物'], ['果物', '野菜・果物'], ['フルーツ', '野菜・果物'],
      ['調味料', '調味料'], ['スパイス', '調味料'],
    ]);
    const normalizeCategory = (c) => {
      if (!c) return 'その他';
      if (['肉・魚', '野菜・果物', '調味料', 'その他'].includes(c)) return c;
      for (const [key, val] of CATEGORY_MAP.entries()) {
        if (String(c).includes(key)) return val;
      }
      return 'その他';
    };
    const normalizeName = (n) => String(n || '').trim();

    const uniqueKey = (it) => `${normalizeCategory(it.category)}::${normalizeName(it.name)}`;
    const dedup = new Map();
    for (const it of Array.isArray(items) ? items : []) {
      const entry = {
        name: normalizeName(it?.name),
        category: normalizeCategory(it?.category),
        maybe: Boolean(it?.maybe),
      };
      if (!entry.name) continue;
      dedup.set(uniqueKey(entry), entry);
    }
    const candidates = Array.from(dedup.values());

    // カテゴリごとにグルーピングして返す
    const grouped = {
      '肉・魚': [],
      '野菜・果物': [],
      '調味料': [],
      'その他': [],
    };
    for (const it of candidates) {
      grouped[it.category] = grouped[it.category] || [];
      grouped[it.category].push(it);
    }
    return Response.json({ candidates: grouped });
  } catch (error) {
    console.error('[ingredients/from-photo] error', error);
    return Response.json({ error: '画像解析中にエラーが発生しました。' }, { status: 500 });
  }
}


