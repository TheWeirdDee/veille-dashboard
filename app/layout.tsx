import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VEILLE",
  description: "Autonomous odds intelligence. Two agents. 104 matches. Zero human input.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-1)" }}
          className="px-6 py-3"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-6 text-sm">
            <a href="/" className="font-semibold" style={{ color: "var(--text-primary)" }}>
              VEILLE
            </a>
            <a href="/signals" style={{ color: "var(--text-secondary)" }}>
              Signals
            </a>
            <a href="/portfolio" style={{ color: "var(--text-secondary)" }}>
              Portfolio
            </a>
            <a href="/onchain" style={{ color: "var(--text-secondary)" }}>
              On-chain
            </a>
            <a href="/subscribers" style={{ color: "var(--text-secondary)" }}>
              Subscribers
            </a>
            <a href="/agent-log" style={{ color: "var(--text-secondary)" }}>
              Agent log
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
