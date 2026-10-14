import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LvxPaths — Free & Curated Cybersecurity Roadmaps",
  description:
    "No $300 bootcamps. No hidden paywalls. Bite-sized guided roadmaps across AI security, red teaming, web pentesting, Linux privesc, exploit writing, and cloud security — saved directly in your browser. We link to free official sources, never host.",
  keywords: [
    "free cybersecurity training",
    "free security courses",
    "cybersecurity roadmaps",
    "CCNA free",
    "Linux privesc",
    "Windows privesc",
    "bug bounty free",
    "blue team free",
    "exploit writing",
    "reverse engineering",
    "red teaming",
    "cloud security",
    "PortSwigger Web Security Academy",
    "Professor Messer",
    "TryHackMe free",
    "cybersecurity for students",
  ],
  authors: [{ name: "LvxPaths", url: "https://github.com/chinyizheeduvoacademy" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "LvxPaths — Free & Curated Cybersecurity Roadmaps",
    description:
      "Bite-sized guided roadmaps across AI security, red teaming, web pentesting, and Linux privesc. Built for students who can't afford paid training.",
    url: "https://lvxcloudevs.me",
    siteName: "LvxPaths",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LvxPaths — Free & Curated Cybersecurity Roadmaps",
    description:
      "Bite-sized guided roadmaps across AI security, red teaming, web pentesting, and Linux privesc. Built for students who can't afford paid training.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
