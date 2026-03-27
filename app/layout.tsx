import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/layout/Nav";
import { QuickCapture } from "@/components/QuickCapture";

export const metadata: Metadata = {
  title: "Work OS",
  description: "Strategic operating system for high-performance finance leaders",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Work OS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <Nav />
        <QuickCapture />
        {/* Desktop: offset for sidebar. Mobile: offset for bottom nav */}
        <main className="md:pl-56 pb-20 md:pb-0 min-h-screen">
          <div className="max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
