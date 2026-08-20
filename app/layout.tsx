import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SJI International Staff Hub",
  description: "The daily staff operations hub for St. Joseph's Institution International.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
