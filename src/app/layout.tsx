import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono", weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "deepnar — Deepesh Sonar · research/dev workstation",
  description:
    "Deepesh Sonar (deepnar): AI/ML research and software engineering. ICE local-first conversational memory, LSREP evaluation protocol (arXiv 2609.16730), Presentation Forge, merged open-source (MNE-Python, ModelDock, semantic-router). Enter the guest workstation.",
  keywords: ["Deepesh Sonar", "deepnar", "AI research", "machine learning", "conversational memory", "ICE", "LSREP", "open source", "software engineering"],
  authors: [{ name: "Deepesh Sonar", url: "https://github.com/Deepnar" }],
  openGraph: {
    title: "deepnar — research/dev workstation",
    description: "Deepesh Sonar's portfolio as an interactive browser workstation: real terminal, local index, actual work inside.",
    type: "website",
  },
};

const THEME_INIT = `(function(){try{var t=localStorage.getItem("deepnar-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className={mono.variable}>
        <a href="#main" className="skip-link">skip to workspace</a>
        <noscript>
          <div style={{ padding: 24, fontFamily: "monospace", maxWidth: 640 }}>
            <h1>Deepesh Sonar (deepnar)</h1>
            <p>AI/ML research + software engineering. This portfolio is an interactive workstation and needs JavaScript.</p>
            <p>Flagships: ICE (local-first conversational memory) · NEXUS (merged fraud-detection PR) · Presentation Forge · timetable-generator.</p>
            <p>Paper: LSREP (arXiv 2609.16730). Merged OSS: ModelDock #221/#222, semantic-router #3288, MNE-Python #14283.</p>
            <p>GitHub: https://github.com/Deepnar · Email: 18deepnar@gmail.com</p>
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
