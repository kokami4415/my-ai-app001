// src/app/api/family/route.js

import { supabase } from '@/lib/supabaseClient'; // Supabaseクライアントをインポート

// GETリクエスト（家族メンバーのリストを取得）
export async function GET(request) {
  try {
    const { data, error } = await supabase
      .from('family_members') // family_members テーブルから
      .select('*') // 全てのカラムを取得
      .order('created_at', { ascending: true }); // 作成日時順に並び替え

    if (error) {
      console.error('家族メンバーの取得に失敗しました:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data);

  } catch (error) {
    console.error('サーバーエラー:', error);
    return Response.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

// POSTリクエスト（新しい家族メンバーを登録）
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, age, gender, height, weight, dislikes } = body;

    // 必須項目が足りない場合はエラー
    if (!name || !age || !gender || !height || !weight || !dislikes) {
      return Response.json({ error: '必須項目が不足しています。' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('family_members') // family_members テーブルに
      .insert([
        { name, age, gender, height, weight, dislikes } // フォームから受け取ったデータを挿入
      ])
      .select(); // 挿入したデータを返す

    if (error) {
      console.error('家族メンバーの登録に失敗しました:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data[0]); // 登録されたメンバー情報を返す

  } catch (error) {
    console.error('サーバーエラー:', error);
    return Response.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}