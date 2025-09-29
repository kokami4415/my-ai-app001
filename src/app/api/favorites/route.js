// src/app/api/favorites/route.js

import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET(request) {
  try {
    const supabase = await createSupabaseServerClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: '未認証' }, { status: 401 });

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return Response.json(data || []);
  } catch (error) {
    console.error('[favorites][GET] error', error);
    return Response.json({ error: 'お気に入りの取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: '未認証' }, { status: 401 });

    const body = await request.json();
    const recipe = body?.recipe;
    if (!recipe) return Response.json({ error: '不正なリクエストです。' }, { status: 400 });

    const row = { user_id: user.id, recipe };
    const { data, error } = await supabase
      .from('favorites')
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    console.error('[favorites][POST] error', error);
    return Response.json({ error: 'お気に入りの保存に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createSupabaseServerClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: '未認証' }, { status: 401 });

    const body = await request.json();
    const id = body?.id;
    if (!id) return Response.json({ error: 'IDが必要です。' }, { status: 400 });

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[favorites][DELETE] error', error);
    return Response.json({ error: 'お気に入りの削除に失敗しました。' }, { status: 500 });
  }
}


