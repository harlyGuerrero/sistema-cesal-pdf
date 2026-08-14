"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// app/globals.css ya define .dark (ver @custom-variant dark) pero nada lo
// activaba hasta ahora — sonner (Fase 13) trajo next-themes como dependencia
// para leer el tema; sin este provider useTheme() no tiene nada real que leer.
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem {...props}>
      {children}
    </NextThemesProvider>
  );
}
