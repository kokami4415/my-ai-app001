// src/app/api/auth/check-email/route.js

import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) return Response.json({ error: 'email is required' }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1, email });
    if (error) throw error;
    const exists = Array.isArray(data?.users) && data.users.length > 0;
    return Response.json({ exists });
  } catch (e) {
    return Response.json({ error: 'lookup failed' }, { status: 500 });
  }
}


