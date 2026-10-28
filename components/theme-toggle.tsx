"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAnimatedThemeChange } from "@/hooks/use-animated-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const changeTheme = useAnimatedThemeChange();
  const [mounted, setMounted] = React.useState(false);
  // resolvedTheme es undefined en el server (next-themes no conoce el tema
  // hasta hidratar) — sin este guard el ícono parpadearía al primer render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={className}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={(event) => changeTheme(isDark ? "light" : "dark", event.currentTarget)}
    >
      {isDark ? <MoonIcon /> : <SunIcon className="size-4 text-amber-300" />}
    </Button>
  );
}
