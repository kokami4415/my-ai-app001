// src/app/api/family/[id]/route.js

import { supabase } from '@/lib/supabaseClient';

// PUTリクエスト（特定の家族メンバーを更新）
export async function PUT(request, { params }) {
  const { id } = params; // URLからIDを取得 (例: /api/family/5 -> idは5)
  try {
    const body = await request.json();
    const { name, age, gender, height, weight, dislikes } = body;

    const { data, error } = await supabase
      .from('family_members')
      .update({ name, age, gender, height, weight, dislikes })
      .eq('id', id) // URLから取得したIDと一致する行を対象に
      .select();

    if (error) {
      console.error('メンバーの更新に失敗しました:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data[0]);

  } catch (error) {
    console.error('サーバーエラー:', error);
    return Response.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

// DELETEリクエスト（特定の家族メンバーを削除）
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('メンバーの削除に失敗しました:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
    
    // 成功したら空のレスポンスを返す
    return new Response(null, { status: 204 });

  } catch (error) {
    console.error('サーバーエラー:', error);
    return Response.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}