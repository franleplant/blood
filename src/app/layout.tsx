import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Blood Markers",
  description: "A Next.js application to track blood markers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body className={inter.className}>
        <nav className="border-b border-slate-200 bg-white">
          <div className="flex items-center gap-6 px-5 py-3">
            <Link
              href="/"
              className="font-semibold tracking-tight text-slate-900"
            >
              Blood Markers
            </Link>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-900">
                Charts
              </Link>
              <Link href="/data" className="hover:text-slate-900">
                Data
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
