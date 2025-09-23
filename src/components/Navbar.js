// src/components/Navbar.js

'use client';

import Link from 'next/link'; // Next.jsのページ間リンク用コンポーネント
import { usePathname } from 'next/navigation'; // 現在のURLパスを取得するフック

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'レシピ生成' },
    { href: '/family', label: '家族情報' },
    { href: '/ingredients', label: '食材リスト' },
    { href: '/history', label: '提案履歴' }, // ★この行を追加
  ];

  return (
    <nav className="bg-white shadow-md mb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center h-16">
          <div className="flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === link.href
                    ? 'border-green-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}