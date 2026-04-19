import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: ">U.os — UnderOS Ecosystem",
  description: "The cyberpunk operating system for your digital life. Manage tasks, finances, and workflows from one hub.",
  keywords: ["UnderOS", "productivity", "cyberpunk", "task management", "finance", "kanban"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="scan-lines noise-bg min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
