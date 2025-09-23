// src/app/api/chat/route.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient'; // ← 作成した通信機をインポート

// .env.localからAPIキーを読み込む
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(request) {
  try {
    // 使用するAIモデルを選択
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// src/app/api/chat/route.js の書き換え箇所

// フロントエンドからのリクエストボディを受け取る
const body = await request.json();
const userInput = body.message; // 変数名をuserInputに変更（分かりやすさのため）

// ここからがプロンプトエンジニアリング！
const prompt = `
  ## 命令
  あなたはどんな食材からも美味しいメニューを考えられる天才料理人です。
  あなたは、ユーザーの入力に対して、その食材から作れる美味しいメニューと、そのレシピを考えてください。    

  ## 制約
  ・メニューは必ず3品以上で構成してください。
  ・メニュー以外の余計な言葉（「承知しました」「〇〇のメニューです」など）は一切含めないでください。
  ・日本語で出力してください。

  ## 出力フォーマット
  以下のフォーマットで出力してください。

  1. メニュー名
  【材料】
  - 材料1
  - 材料2
  ...
  【作り方】
  1. 手順1
  2. 手順2
  ...

  2. メニュー名
  【材料】
  - 材料1
  - 材料2
  ...
  【作り方】
  1. 手順1
  2. 手順2
  ...

  （3品以上、同様に続けてください）

  ## 入力
  ${userInput}
`;

// 組み立てたプロンプトをGeminiに送信
const result = await model.generateContent(prompt); // 変数を prompt に変更

// (ファイル後半の処理は変更なし)
    const response = await result.response;
    const aiMessage = response.text(); // AIの応答を取得

    // Supabaseの'chats'テーブルにデータを挿入
    const { error } = await supabase
      .from('chats') // 'chats'テーブルを指定
      .insert(
        [{ user_message: userInput, ai_response: aiMessage }], // 挿入するデータ
      );

    // もしエラーがあればログに出力
    if (error) {
      console.error('Supabaseへのデータ保存に失敗しました:', error);
    }

    // フロントエンドにAIの応答を返す
    return Response.json({ message: aiMessage });

  } catch (error) {
    // エラーハンドリング
    console.error(error);
    return Response.json({ error: 'AIとの通信に失敗しました。' }, { status: 500 });
  }
}