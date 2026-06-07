import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Hatchett — Marketing Dashboard",
  description: "Multi-tenant marketing analytics dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#1A1A1A] text-[#F5F5F5] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
