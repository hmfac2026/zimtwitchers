import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Zim Twitchers",
  description:
    "A birdwatching app for friends — track sightings and compete on the leaderboard.",
  applicationName: "Zim Twitchers",
  icons: {
    icon: [
      { url: "/logo/pitta-icon.svg", type: "image/svg+xml" },
      { url: "/logo/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/logo/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/logo/icon-512.png", sizes: "512x512" }],
  },
  appleWebApp: {
    capable: true,
    title: "Twitchers",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2D5016",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
