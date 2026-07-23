import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "省域资源一张图人工智能平台原型",
  description: "多智能体协同编排原型",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
