// src/app/api/hello/route.js

export async function GET(request) {
    return Response.json({ message: 'こんにちは！APIからの応答です！' });
  }