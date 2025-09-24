import { M_PLUS_Rounded_1c, Caveat } from "next/font/google"; // ★変更
import "./globals.css";
import Navbar from "@/components/Navbar";

// ★フォント設定を追加
const rounded_mplus = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "700"], // 通常と太字
  variable: "--font-rounded-mplus", // CSSで使うための変数名
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-caveat", // CSSで使うための変数名
});

export const metadata = {
  title: "レシピおまかせ君",
  description: "AIがあなたの冷蔵庫の食材から最適なレシピを提案します。",
  icons: {
    icon: [
      { url: "/image/chef_fabicon.png", sizes: "32x32", type: "image/png" },
      { url: "/image/chef_fabicon.png", sizes: "192x192", type: "image/png" },
      { url: "/image/chef_fabicon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/image/chef_fabicon.png",
    apple: "/image/chef_fabicon.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      {/* ★font変数をbodyに適用 */}
      <body className={`${rounded_mplus.variable} ${caveat.variable} font-sans`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
