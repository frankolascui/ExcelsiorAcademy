import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Excelsior Academy",
  description: "Resúmenes, flashcards y simulacros del Protocolo Excelsior",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
