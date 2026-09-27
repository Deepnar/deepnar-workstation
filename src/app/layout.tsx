import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono" });
const sans = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: "deepnar — research/dev workstation",
  description: "Deepesh Sonar's portfolio as a browser-based research + development workstation: Neovim/TUI spirit, real terminal, local assistant, actual work inside.",
};

const THEME_INIT = `(function(){try{var t=localStorage.getItem("deepnar-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className={`${mono.variable} ${sans.variable}`}>
        <a href="#main" className="skip-link">skip to workspace</a>
        {children}
      </body>
    </html>
  );
}
