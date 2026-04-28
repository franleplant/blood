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
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b">
          <div className="container mx-auto flex items-center gap-6 px-4 py-3 md:px-6 lg:px-8">
            <Link href="/" className="font-semibold tracking-tight">
              Blood Markers
            </Link>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Charts
              </Link>
              <Link href="/data" className="hover:text-foreground">
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
