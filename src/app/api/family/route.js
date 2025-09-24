// src/app/api/family/route.js

import { createSupabaseServerClient } from '@/lib/supabaseServer'; // サーバー用クライアント

// GETリクエスト（家族メンバーのリストを取得）
export async function GET(request) {
  try {
    const supabase = await createSupabaseServerClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: '未認証' }, { status: 401 });

    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .order('created_at', { ascending: true });

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
    const supabase = await createSupabaseServerClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: '未認証' }, { status: 401 });

    const body = await request.json();
    const { name, age, gender, height, weight, dislikes } = body;

    if (!name || !age || !gender || !height || !weight || !dislikes) {
      return Response.json({ error: '必須項目が不足しています。' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('family_members')
      .insert([
        { name, age, gender, height, weight, dislikes }
      ])
      .select();

    if (error) {
      console.error('家族メンバーの登録に失敗しました:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data[0]);

  } catch (error) {
    console.error('サーバーエラー:', error);
    return Response.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}