import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar"; // ★インポートを追加

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "レシピおまかせ君",
  description: "AIがあなたの家族に最適なレシピを提案します",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Navbar /> {/* ★ここに追加★ */}
        {children}
      </body>
    </html>
  );
}
