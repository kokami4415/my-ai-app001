// src/app/api/ingredients/route.js

import { supabase } from '@/lib/supabaseClient';

// GETリクエスト（変更なし）
export async function GET(request) {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POSTリクエスト（★カテゴリ別に一括更新する機能に刷新★）
export async function POST(request) {
  try {
    // categoryとingredients(配列)を受け取るように変更
    const { category, ingredients } = await request.json(); 
    if (!category || !Array.isArray(ingredients)) {
      return Response.json({ error: '不正なデータ形式です。' }, { status: 400 });
    }

    // 1. まず指定されたカテゴリの食材をすべて削除
    const { error: deleteError } = await supabase
      .from('ingredients')
      .delete()
      .eq('category', category); // eqは'equal'。指定されたカテゴリと一致するものだけを対象に

    if (deleteError) throw deleteError;

    // 2. 新しい食材リストを挿入（リストが空でなければ）
    if (ingredients.length > 0) {
      // すべての食材にカテゴリ情報を付与する
      const newRows = ingredients.map(name => ({ name, category }));
      const { error: insertError } = await supabase
        .from('ingredients')
        .insert(newRows);
      if (insertError) throw insertError;
    }

    return Response.json({ message: `${category}の食材リストを更新しました。` });

  } catch (error) {
    console.error('食材リストの更新エラー:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}