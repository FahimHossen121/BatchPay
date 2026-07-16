import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "BatchPay",
  description: "Gas-efficient ERC20 batch transfer protocol",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const wagmiCookie =
    (await headers())
      .get("cookie")
      ?.split("; ")
      .find((cookie) => cookie.startsWith("wagmi.store=")) ?? null;

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers wagmiCookie={wagmiCookie}>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
