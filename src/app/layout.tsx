import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "シフト管理システム",
  description: "LINE Bot中心のシフト管理システム - 小規模チーム向け",
  viewport: "width=device-width, initial-scale=1",
  keywords: ["シフト管理", "LINE Bot", "スケジュール", "勤務管理"],
  authors: [{ name: "Shift Management System" }],
  robots: "noindex, nofollow", // 内部システムのため検索エンジンをブロック
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#f8fafc" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
