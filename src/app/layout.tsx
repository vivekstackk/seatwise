import type { Metadata } from "next";
import "./globals.css";

import GlobalCursor from "./components/GlobalCursor";

export const metadata: Metadata = {
  title: "SeatWise",
  description: "Live event ticketing and exact seat discovery.",
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