import type { Metadata, Viewport } from "next";
import { Cinzel, Literata, Plus_Jakarta_Sans } from "next/font/google";
import { KeyboardFocusGuard } from "@/components/keyboard-focus-guard";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  // En Android/Chrome el layout se reajusta al teclado virtual
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full overflow-x-clip">
      <body
        className={`${sans.variable} ${display.variable} ${wizard.variable} min-h-full overflow-x-clip antialiased`}
      >
        <ThemeProvider>
          <KeyboardFocusGuard />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
