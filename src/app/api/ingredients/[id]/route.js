// src/app/api/ingredients/[id]/route.js

import { supabase } from '@/lib/supabaseClient';

// DELETEリクエスト（特定の食材を削除）
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}