import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anotasi Sentimen Ulasan Wisata",
  description: "Tool anotasi manual label sentimen untuk data ulasan wisata",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
