"use client";

import { useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { SearchTrigger } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import type { User } from "next-auth";

export function DashboardHeader({ user }: { user: User }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight">
            VaultView
          </span>
        </div>

        <div className="flex items-center gap-3">
          <SearchTrigger />
          <ThemeToggle />

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || "Avatar"}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {user.name?.[0] || user.email?.[0] || "?"}
                </div>
              )}
              <span className="text-sm hidden sm:block">{user.name}</span>
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-48 rounded-xl border border-border bg-card shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
