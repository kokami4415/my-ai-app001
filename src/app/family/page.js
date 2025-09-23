// src/app/family/page.js

'use client';
import { useState, useEffect } from 'react';

export default function FamilyPage() {
  // 家族情報管理のState
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', age: '', gender: '男性', height: '', weight: '', dislikes: '',
  });

  // フォーム入力変更ハンドラ
  const handleFormChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // 家族メンバー取得
  const fetchFamilyMembers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/family');
      if (!response.ok) throw new Error('家族メンバーの取得に失敗しました。');
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 家族情報の登録・更新
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let response;
      const body = {
        ...formData,
        age: parseInt(formData.age),
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
      };

      if (isEditing) {
        // 更新処理
        response = await fetch(`/api/family/${editingMemberId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error('メンバーの更新に失敗しました。');
        const updatedMember = await response.json();
        setMembers(members.map((m) => (m.id === editingMemberId ? updatedMember : m)));
      } else {
        // 新規登録処理
        response = await fetch('/api/family', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error('メンバーの登録に失敗しました。');
        const newMember = await response.json();
        setMembers([...members, newMember]);
      }

      resetForm();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // メンバー削除
  const handleDelete = async (id) => {
    if (!window.confirm('本当にこのメンバーを削除しますか？')) return;

    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/family/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('メンバーの削除に失敗しました。');
      setMembers(members.filter((m) => m.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 編集開始
  const startEditing = (member) => {
    setIsEditing(true);
    setEditingMemberId(member.id);
    setFormData({
      name: member.name,
      age: member.age,
      gender: member.gender,
      height: member.height,
      weight: member.weight,
      dislikes: member.dislikes,
    });
    window.scrollTo(0, 0);
  };

  // フォームリセット
  const resetForm = () => {
    setIsEditing(false);
    setEditingMemberId(null);
    setFormData({
      name: '',
      age: '',
      gender: '男性',
      height: '',
      weight: '',
      dislikes: '',
    });
  };

  // 初回データ取得
  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  // JSX
  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">家族情報管理</h1>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-8">
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 font-bold mb-2">名前</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={handleFormChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="age" className="block text-gray-700 font-bold mb-2">年齢</label>
          <input
            id="age"
            type="number"
            value={formData.age}
            onChange={handleFormChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
            required
            min="0"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="gender" className="block text-gray-700 font-bold mb-2">性別</label>
          <select
            id="gender"
            value={formData.gender}
            onChange={handleFormChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
          >
            <option value="男性">男性</option>
            <option value="女性">女性</option>
            <option value="その他">その他</option>
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="height" className="block text-gray-700 font-bold mb-2">身長 (cm)</label>
          <input
            id="height"
            type="number"
            value={formData.height}
            onChange={handleFormChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
            min="0"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="weight" className="block text-gray-700 font-bold mb-2">体重 (kg)</label>
          <input
            id="weight"
            type="number"
            value={formData.weight}
            onChange={handleFormChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
            min="0"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="dislikes" className="block text-gray-700 font-bold mb-2">嫌いな食材</label>
          <input
            id="dislikes"
            type="text"
            value={formData.dislikes}
            onChange={handleFormChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
            placeholder="例: トマト, ピーマン"
          />
        </div>
        <div className="flex items-center">
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mr-2"
            disabled={isLoading}
          >
            {isEditing ? '更新' : '登録'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              disabled={isLoading}
            >
              キャンセル
            </button>
          )}
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </form>

      <h2 className="text-xl font-semibold mb-4">家族メンバー一覧</h2>
      {isLoading ? (
        <p>読み込み中...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b">名前</th>
                <th className="px-4 py-2 border-b">年齢</th>
                <th className="px-4 py-2 border-b">性別</th>
                <th className="px-4 py-2 border-b">身長</th>
                <th className="px-4 py-2 border-b">体重</th>
                <th className="px-4 py-2 border-b">嫌いな食材</th>
                <th className="px-4 py-2 border-b">操作</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-500">メンバーが登録されていません。</td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-2 border-b">{member.name}</td>
                    <td className="px-4 py-2 border-b">{member.age}</td>
                    <td className="px-4 py-2 border-b">{member.gender}</td>
                    <td className="px-4 py-2 border-b">{member.height}</td>
                    <td className="px-4 py-2 border-b">{member.weight}</td>
                    <td className="px-4 py-2 border-b">{member.dislikes}</td>
                    <td className="px-4 py-2 border-b">
                      <button
                        onClick={() => startEditing(member)}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded mr-2"
                        disabled={isLoading}
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded"
                        disabled={isLoading}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
