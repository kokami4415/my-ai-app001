// src/app/page.js

'use client';

// useEffectを追加でインポート
import { useState, useEffect } from 'react';
// Supabaseクライアントをインポート
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [userInput, setUserInput] = useState('');
  const [aiResponse, setAiResponse] = useState('AIからの返信がここに表示されます。');
  const [isLoading, setIsLoading] = useState(false);
  
  // --- ↓ここからが追加部分① ---
  const [chatHistory, setChatHistory] = useState([]); // 会話履歴を保存する新しいstate

  // ページが最初に読み込まれた時に会話履歴を取得する
  useEffect(() => {
    const fetchChatHistory = async () => {
      // Supabaseの'chats'テーブルからデータを取得
      // created_at（作成日時）の降順（新しい順）で並び替え
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('履歴の取得に失敗しました', error);
      } else {
        setChatHistory(data); // 取得したデータでstateを更新
      }
    };

    fetchChatHistory();
  }, []); // 第2引数の[]は「最初の一回だけ実行する」という意味のおまじない
  // --- ↑ここまでが追加部分① ---

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userInput) return; // 入力が空なら何もしない
    setIsLoading(true);
    setAiResponse('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput }),
      });

      const data = await response.json();
      setAiResponse(data.message);

      // --- ↓ここからが追加部分② ---
      // 会話履歴の先頭に新しいやり取りを追加する
      const newChat = {
        user_message: userInput,
        ai_response: data.message,
        created_at: new Date().toISOString(), // 現在時刻を追加
      };
      setChatHistory([newChat, ...chatHistory]);
      // --- ↑ここまでが追加部分② ---

    } catch (error) {
      setAiResponse('エラーが発生しました。');
    } finally {
      setIsLoading(false);
      setUserInput(''); // 送信後に入力フォームを空にする
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      <h1 className="text-3xl font-bold text-center mb-6">AIチャットサービス (記憶機能付き)</h1>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="AIへのメッセージを入力..."
          className="flex-grow p-2 border rounded-md"
        />
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-400">
          {isLoading ? '送信中...' : '送信'}
        </button>
      </form>
      <div className="mt-5 p-4 border rounded-md bg-gray-50">
        <p className="font-bold">AIの最新の応答:</p>
        <p className="mt-2 whitespace-pre-wrap">{aiResponse}</p>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">会話履歴</h2>
        <div className="space-y-4">
          {chatHistory.length === 0 ? (
            <p className="text-gray-500">まだ会話はありません。最初のメッセージを送ってみましょう！</p>
          ) : (
            chatHistory.map((chat, index) => (
              <div key={index} className="border rounded-md p-4 bg-white shadow-sm">
                <p><strong className="font-semibold">あなた:</strong> {chat.user_message}</p>
                <p className="mt-2"><strong className="font-semibold">AI:</strong> <span className="whitespace-pre-wrap">{chat.ai_response}</span></p>
                <p className="text-xs text-gray-400 mt-2 text-right">{new Date(chat.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}