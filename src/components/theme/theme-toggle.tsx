"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme === "system") setTheme("dark");
  }, [theme, setTheme]);

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled aria-hidden />;
  }

  const isLight = resolvedTheme === "light";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isLight ? "Ativar tema escuro" : "Ativar tema claro"}
      onClick={() => setTheme(isLight ? "dark" : "light")}
    >
      {isLight ? <Moon /> : <Sun />}
    </Button>
  );
}
