"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { CommandPalette } from "./command-palette";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
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
    </SessionProvider>
  );
}
