import type { Metadata } from "next";
import "./globals.css";

import GlobalCursor from "./components/GlobalCursor";

export const metadata: Metadata = {
  title: "SeatWise",
  description: "Live event ticketing and exact seat discovery.",
  // Declared explicitly so the one file in public/ is the only copy of
  // the mark. Next's alternative is the app/icon.svg file convention,
  // which would mean a second, drift-prone duplicate of the same SVG.
  // The create-next-app default app/favicon.ico is gone — with it still
  // in place Next emitted both and the tab kept showing the starter icon.
  icons: {
    icon: [{ url: "/fevicon.svg", type: "image/svg+xml" }],
    shortcut: "/fevicon.svg",
    apple: "/fevicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <GlobalCursor />

        {children}
      </body>
    </html>
  );
}