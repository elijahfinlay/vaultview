"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { extractImageData } from "@/lib/blurhash";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  error?: string;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
const MAX_SIZE = 20 * 1024 * 1024;
const MAX_CONCURRENT = 3;

export function UploadDropzone({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [queue, setQueue] = useState<UploadItem[]>([]);

  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const uploadFile = useCallback(
    async (item: UploadItem) => {
      try {
        updateItem(item.id, { status: "uploading", progress: 10 });

        // 1. Get presigned URL
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: item.file.name,
            contentType: item.file.type,
            size: item.file.size,
          }),
        });

        if (!presignRes.ok) {
          const err = await presignRes.json();
          throw new Error(err.error || "Failed to get upload URL");
        }

        const { presignedUrl, key } = await presignRes.json();
        updateItem(item.id, { progress: 30 });

        // 2. Upload directly to R2
        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": item.file.type },
          body: item.file,
        });

        if (!uploadRes.ok) throw new Error("Upload to storage failed");
        updateItem(item.id, { progress: 70, status: "processing" });

        // 3. Extract image data (blurhash + dimensions)
        const imageData = await extractImageData(item.file);
        updateItem(item.id, { progress: 85 });

        // 4. Complete upload (create DB row + trigger AI)
        const completeRes = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            filename: item.file.name,
            contentType: item.file.type,
            size: item.file.size,
            ...imageData,
          }),
        });

        if (!completeRes.ok) throw new Error("Failed to save image");

        updateItem(item.id, { progress: 100, status: "done" });
        toast.success(`Uploaded ${item.file.name}`);
        onUploadComplete();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        updateItem(item.id, { status: "error", error: message });
        toast.error(`Failed: ${item.file.name}`, { description: message });
      }
    },
    [onUploadComplete]
  );

  const processQueue = useCallback(
    async (items: UploadItem[]) => {
      const pending = items.filter((i) => i.status === "pending");
      const active = items.filter((i) => i.status === "uploading" || i.status === "processing");

      const slotsAvailable = MAX_CONCURRENT - active.length;
      const toStart = pending.slice(0, slotsAvailable);

      for (const item of toStart) {
        uploadFile(item).then(() => {
          setQueue((prev) => {
            processQueue(prev);
            return prev;
          });
        });
      }
    },
    [uploadFile]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newItems: UploadItem[] = acceptedFiles
        .filter((file) => {
          if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error(`${file.name}: unsupported format`);
            return false;
          }
          if (file.size > MAX_SIZE) {
            toast.error(`${file.name}: exceeds 20MB limit`);
            return false;
          }
          return true;
        })
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          progress: 0,
          status: "pending" as const,
        }));

      if (newItems.length === 0) return;

      setQueue((prev) => {
        const next = [...prev, ...newItems];
        setTimeout(() => processQueue(next), 0);
        return next;
      });
    },
    [processQueue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif", ".avif"],
    },
    multiple: true,
  });

  const activeUploads = queue.filter(
    (i) => i.status !== "done" || Date.now() - 2000 < 0
  );

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">
            {isDragActive ? "Drop images here" : "Drag & drop images"}
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse. JPEG, PNG, WebP, GIF, AVIF up to 20MB
          </p>
        </div>
      </div>

      <AnimatePresence>
        {queue.filter((i) => i.status !== "done").length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {queue
              .filter((i) => i.status !== "done")
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.status === "error"
                        ? item.error
                        : item.status === "processing"
                        ? "Processing..."
                        : item.status === "uploading"
                        ? "Uploading..."
                        : "Waiting..."}
                    </p>
                  </div>
                  {item.status !== "error" && (
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                  {item.status === "error" && (
                    <span className="text-xs text-destructive font-medium">
                      Failed
                    </span>
                  )}
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
