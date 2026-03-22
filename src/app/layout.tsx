import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hearth",
  description: "Family tasks, finally organized.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-primary antialiased">
        {children}
      </body>
    </html>
  );
}
