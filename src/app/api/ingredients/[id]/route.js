// src/app/api/ingredients/[id]/route.js

import { createSupabaseServerClient } from '@/lib/supabaseServer';

// DELETEリクエスト（特定の食材を削除）
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const supabase = await createSupabaseServerClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: '未認証' }, { status: 401 });

    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}