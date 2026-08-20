import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Staff Hub",
  description: "The daily operations hub for school staff.",
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
