import type { Metadata } from "next";
import { Cinzel, Literata, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const display = Literata({
  variable: "--font-display",
  subsets: ["latin"],
});

const wizard = Cinzel({
  variable: "--font-wizard",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Callejón Diagon — Tu biblioteca personal",
  description:
    "Gestiona tus lecturas: wishlist, progreso, valoraciones y estadísticas anuales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full">
      <body
        className={`${sans.variable} ${display.variable} ${wizard.variable} min-h-full antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
