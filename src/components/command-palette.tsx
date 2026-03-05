"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  url: string;
  originalName: string;
  aiDescription: string | null;
  aiLabels: string[] | null;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Cmd+K shortcut + custom event from SearchTrigger
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const customHandler = () => setOpen(true);
    window.addEventListener("keydown", keyHandler);
    window.addEventListener("vaultview:open-search", customHandler);
    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("vaultview:open-search", customHandler);
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/images?q=${encodeURIComponent(query)}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.images);
        }
      } catch {
        // Fail silently
      }
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  // Save recent searches
  const saveRecentSearch = useCallback((q: string) => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("vaultview:recent-searches") || "[]"
      );
      const updated = [q, ...stored.filter((s: string) => s !== q)].slice(
        0,
        5
      );
      localStorage.setItem(
        "vaultview:recent-searches",
        JSON.stringify(updated)
      );
    } catch {
      // localStorage unavailable
    }
  }, []);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  useEffect(() => {
    try {
      setRecentSearches(
        JSON.parse(
          localStorage.getItem("vaultview:recent-searches") || "[]"
        )
      );
    } catch {
      // ignore
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg mx-4"
          >
            <Command
              className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
              shouldFilter={false}
            >
              <div className="flex items-center gap-2 px-4 border-b border-border">
                <svg
                  className="w-4 h-4 text-muted-foreground flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search images..."
                  className="flex-1 py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-border text-[10px] text-muted-foreground">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-72 overflow-y-auto p-2">
                {loading && (
                  <Command.Loading>
                    <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                      <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      Searching...
                    </div>
                  </Command.Loading>
                )}

                <Command.Empty className="p-3 text-xs text-muted-foreground text-center">
                  {query ? "No images found" : "Type to search your gallery"}
                </Command.Empty>

                {/* Recent searches */}
                {!query &&
                  recentSearches.length > 0 && (
                    <Command.Group heading="Recent">
                      {recentSearches.map((s) => (
                        <Command.Item
                          key={s}
                          value={s}
                          onSelect={() => setQuery(s)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-muted data-[selected]:bg-muted"
                        >
                          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {s}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                {/* Search results */}
                {results.length > 0 && (
                  <Command.Group heading="Images">
                    {results.map((result) => (
                      <Command.Item
                        key={result.id}
                        value={result.id}
                        onSelect={() => {
                          saveRecentSearch(query);
                          setOpen(false);
                          // Navigate to dashboard with search
                          router.push(`/dashboard?q=${encodeURIComponent(query)}`);
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted data-[selected]:bg-muted"
                      >
                        <img
                          src={result.url}
                          alt={result.originalName}
                          className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {result.originalName}
                          </p>
                          {result.aiDescription && (
                            <p className="text-xs text-muted-foreground truncate">
                              {result.aiDescription}
                            </p>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Search by name, labels, description, or detected text</span>
                <div className="flex items-center gap-2">
                  <span>Navigate</span>
                  <kbd className="px-1 py-0.5 rounded border border-border">↑↓</kbd>
                </div>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Small button to trigger search from the header
export function SearchTrigger() {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(new CustomEvent("vaultview:open-search"));
      }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground text-xs transition-colors cursor-pointer"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      Search
      <kbd className="hidden sm:inline px-1 py-0.5 rounded border border-border text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}
