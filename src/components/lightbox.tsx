"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageData {
  id: string;
  url: string;
  originalName: string;
  width: number | null;
  height: number | null;
  size: number;
  aiLabels: string[] | null;
  aiDescription: string | null;
  aiColors: string[] | null;
  aiText: string | null;
  analyzed: string | null;
  createdAt: string;
}

export function Lightbox({
  images,
  initialIndex,
  onClose,
  onDelete,
}: {
  images: ImageData[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [showMeta, setShowMeta] = useState(false);
  const image = images[index];

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, images.length - 1));
  }, [images.length]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          next();
          break;
        case "ArrowLeft":
          prev();
          break;
        case "i":
          setShowMeta((s) => !s);
          break;
        case "Delete":
        case "Backspace":
          if (e.metaKey || e.ctrlKey) {
            onDelete(image.id);
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, next, prev, onDelete, image.id]);

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);

  if (!image) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart === null) return;
        const diff = e.changedTouches[0].clientX - touchStart;
        if (Math.abs(diff) > 50) {
          diff > 0 ? prev() : next();
        }
        setTouchStart(null);
      }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        <p className="text-white/70 text-sm">
          {index + 1} / {images.length}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMeta(!showMeta)}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Toggle info (i)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(image.id)}
            className="p-2 rounded-lg text-white/70 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
            title="Delete (Cmd+Delete)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {index > 0 && (
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer z-10"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}
      {index < images.length - 1 && (
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer z-10"
          style={{ right: showMeta ? "340px" : "16px" }}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* Main image */}
      <AnimatePresence mode="wait">
        <motion.img
          key={image.id}
          src={image.url}
          alt={image.aiDescription || image.originalName}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg"
          style={{
            maxWidth: showMeta ? "calc(85vw - 320px)" : "85vw",
          }}
        />
      </AnimatePresence>

      {/* Metadata panel */}
      <AnimatePresence>
        {showMeta && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 right-0 bottom-0 w-80 bg-card/95 backdrop-blur-xl border-l border-border overflow-y-auto p-5"
          >
            <h3 className="text-sm font-semibold mb-4 text-foreground">Details</h3>

            <div className="space-y-4 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Filename</p>
                <p className="text-foreground font-medium break-all">{image.originalName}</p>
              </div>
              <div className="flex gap-4">
                {image.width && image.height && (
                  <div>
                    <p className="text-muted-foreground mb-0.5">Dimensions</p>
                    <p className="text-foreground">{image.width} x {image.height}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground mb-0.5">Size</p>
                  <p className="text-foreground">{formatSize(image.size)}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Uploaded</p>
                <p className="text-foreground">{new Date(image.createdAt).toLocaleDateString()}</p>
              </div>

              {image.analyzed && (
                <>
                  {image.aiDescription && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">AI Description</p>
                      <p className="text-foreground">{image.aiDescription}</p>
                    </div>
                  )}
                  {image.aiLabels && image.aiLabels.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1">AI Labels</p>
                      <div className="flex flex-wrap gap-1">
                        {image.aiLabels.map((label) => (
                          <span
                            key={label}
                            className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {image.aiColors && image.aiColors.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1">Dominant Colors</p>
                      <div className="flex gap-1">
                        {image.aiColors.map((color) => (
                          <div
                            key={color}
                            className="w-6 h-6 rounded-md border border-border"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {image.aiText && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">Detected Text</p>
                      <p className="text-foreground whitespace-pre-wrap line-clamp-6">
                        {image.aiText}
                      </p>
                    </div>
                  )}
                </>
              )}

              {!image.analyzed && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  AI analysis pending...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
