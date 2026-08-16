import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Fuente general del sistema: la pila nativa del SO (system-ui, Segoe UI,
// Roboto), no una fuente descargada — decisión explícita del usuario, ver
// --font-sans en globals.css. Geist Mono se mantiene aparte, solo para el
// puñado de datos tabulares/código que usan font-mono (ver
// app/(app)/activos/tipos/page.tsx).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Importación de Productos",
  description: "Sistema de importación y clasificación patrimonial de productos desde PDFs",
};

// Fase 13: el sidebar (y la sesión que necesita para renderizarlo) se movió
// a app/(app)/layout.tsx — /login vive fuera de ese route group y no debe
// mostrar el sidebar de una app en la que todavía no iniciaste sesión (ver
// app/(app)/layout.tsx).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
