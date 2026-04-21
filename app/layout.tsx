import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "台本ジェネレーター | 神様メッセージ自動生成",
  description: "スピリチュアル・神様メッセージ台本を自動生成するツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
