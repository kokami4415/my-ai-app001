// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  // App Router用の正しいファイル監視パス
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // あなたが設定したいカスタムカラー
      colors: {
        'brand-orange': '#F97316',
        'brand-orange-dark': '#EA580C',
      },
      // あなたが設定したいカスタムフォント
      fontFamily: {
        sans: ['var(--font-rounded-mplus)', 'sans-serif'],
        handwriting: ['var(--font-caveat)', 'cursive'],
      },
      // あなたが設定したいカスタム背景画像
      backgroundImage: {
        'wood-pattern': "url('/images/wood-bg.jpg')",
        'fridge-pattern': "url('/images/fridge-bg.jpg')",
      },
    },
  },
  plugins: [],
};