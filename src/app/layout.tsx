import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";

const sans = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "FlowForge — Visual Workflow Builder",
  description: "Susun, hubungkan, dan jalankan alur kerja secara visual.",
};

// viewport-fit=cover mengaktifkan env(safe-area-inset-*); resizes-content membuat tinggi dvh ikut mengecil
// saat keyboard layar muncul, sehingga bottom sheet tetap berada di atas keyboard.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${mono.variable}`}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-ember-500 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
        >
          Lewati ke canvas
        </a>
        {children}
      </body>
    </html>
  );
}
