"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { CommandPalette } from "./command-palette";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <CommandPalette />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className:
            "!bg-card !text-foreground !border-border !shadow-lg",
        }}
      />
    </ThemeProvider>
  );
}
