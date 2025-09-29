// src/components/Navbar.js

'use client';

import Link from 'next/link'; // Next.jsのページ間リンク用コンポーネント
import { usePathname } from 'next/navigation'; // 現在のURLパスを取得するフック
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setUser(data?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
    });
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const menuLinks = [
    { href: '/ingredients', label: '食材リスト' },
    { href: '/shopping-memo', label: '買い物メモ' },
    { href: '/favorites', label: 'お気に入り' },
    { href: '/history', label: '提案履歴' },
    { href: '/family', label: '家族情報' },
  ];

  return (
    <nav className="bg-white shadow-md mb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 relative">
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium text-center ${
                pathname === '/'
                  ? 'border-green-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              レシピ生成
            </Link>
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700"
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-expanded={isMenuOpen ? 'true' : 'false'}
              >
                メニュー
                <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.187l3.71-3.957a.75.75 0 111.08 1.04l-4.243 4.525a.75.75 0 01-1.094 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>
              </button>
              {isMenuOpen && (
                <div className="absolute z-50 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    {menuLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`block px-4 py-2 text-sm ${pathname === link.href ? 'text-green-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
                <button
                  className="px-4 py-2 bg-brand-orange text-white rounded-md shadow hover:bg-brand-orange-dark text-sm font-semibold"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/login';
                  }}
                >
                  ログアウト
                </button>
              </>
            ) : (
              <Link className="px-4 py-2 bg-brand-orange text-white rounded-md shadow hover:bg-brand-orange-dark text-sm font-semibold" href="/login">ログイン</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}