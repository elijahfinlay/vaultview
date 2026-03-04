"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { UploadDropzone } from "./upload-dropzone";
import { MasonryGrid } from "./masonry-grid";
import { Lightbox } from "./lightbox";
import { FilterChips } from "./filter-chips";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface GalleryProps {
  userId: string;
  initialCount: number;
}

type SortOption = "date_desc" | "date_asc" | "name_asc" | "name_desc" | "size_desc" | "size_asc";

export function Gallery({ userId, initialCount }: GalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("date_desc");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const { data: categoriesData, mutate: mutateCategories } = useSWR(
    "/api/categories",
    fetcher
  );

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    params.set("sort", sort);
    if (previousPageData?.nextCursor) {
      params.set("cursor", previousPageData.nextCursor);
    }
    return `/api/images?${params.toString()}`;
  };

  const {
    data: pages,
    size,
    setSize,
    mutate: mutateImages,
    isLoading,
  } = useSWRInfinite(getKey, fetcher, {
    revalidateFirstPage: false,
  });

  const allImages = pages?.flatMap((p) => p.images) || [];
  const hasMore = pages?.[pages.length - 1]?.hasMore;

  // Infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore) {
          setSize((s) => s + 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, setSize]);

  const handleUploadComplete = useCallback(() => {
    mutateImages();
    mutateCategories();
  }, [mutateImages, mutateCategories]);

  const handleDelete = useCallback(
    async (imageId: string) => {
      try {
        const res = await fetch("/api/images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: imageId }),
        });
        if (!res.ok) throw new Error();
        toast.success("Image deleted");
        mutateImages();
        setLightboxIndex(null);
      } catch {
        toast.error("Failed to delete image");
      }
    },
    [mutateImages]
  );

  const isEmpty = !isLoading && allImages.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Gallery</h1>
          <p className="text-sm text-muted-foreground">
            {initialCount} {initialCount === 1 ? "image" : "images"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-foreground cursor-pointer"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="size_desc">Largest first</option>
            <option value="size_asc">Smallest first</option>
          </select>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Upload
          </button>
        </div>
      </div>

      {/* Upload area (collapsible) */}
      {showUpload && (
        <UploadDropzone onUploadComplete={handleUploadComplete} />
      )}

      {/* Category filter chips */}
      {categoriesData && categoriesData.length > 0 && (
        <FilterChips
          categories={categoriesData}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <svg
              className="w-7 h-7 text-muted-foreground"
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
          <h3 className="text-sm font-medium text-foreground">
            {selectedCategory ? "No images in this category" : "No images yet"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedCategory
              ? "Upload images or change the filter"
              : "Upload your first image to get started"}
          </p>
          {!showUpload && !selectedCategory && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              Upload images
            </button>
          )}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="mb-3 rounded-xl bg-muted animate-pulse break-inside-avoid"
              style={{ height: `${150 + Math.random() * 150}px` }}
            />
          ))}
        </div>
      )}

      {/* Masonry grid */}
      {!isLoading && allImages.length > 0 && (
        <MasonryGrid
          images={allImages}
          onImageClick={(index) => setLightboxIndex(index)}
        />
      )}

      {/* Load more sentinel */}
      <div ref={loadMoreRef} className="h-4" />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={allImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
