"use client";

import { motion } from "framer-motion";
import { BlurhashPlaceholder } from "./blurhash-placeholder";

interface ImageData {
  id: string;
  url: string;
  originalName: string;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  aiLabels: string[] | null;
  aiDescription: string | null;
}

export function MasonryGrid({
  images,
  onImageClick,
}: {
  images: ImageData[];
  onImageClick: (index: number) => void;
}) {
  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3">
      {images.map((image, index) => (
        <motion.div
          key={image.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
          className="mb-3 break-inside-avoid"
        >
          <ImageCard
            image={image}
            onClick={() => onImageClick(index)}
          />
        </motion.div>
      ))}
    </div>
  );
}

function ImageCard({
  image,
  onClick,
}: {
  image: ImageData;
  onClick: () => void;
}) {
  const aspectRatio =
    image.width && image.height ? image.width / image.height : 4 / 3;

  return (
    <button
      onClick={onClick}
      className="group relative w-full rounded-xl overflow-hidden bg-muted cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ aspectRatio }}
    >
      {/* Blurhash placeholder */}
      {image.blurhash && (
        <BlurhashPlaceholder
          hash={image.blurhash}
          width={32}
          height={Math.round(32 / aspectRatio)}
          className="absolute inset-0 w-full h-full"
        />
      )}

      {/* Actual image */}
      <img
        src={image.url}
        alt={image.aiDescription || image.originalName}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-xs font-medium truncate">
            {image.originalName}
          </p>
          {image.aiLabels && image.aiLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {image.aiLabels.slice(0, 3).map((label) => (
                <span
                  key={label}
                  className="px-1.5 py-0.5 rounded-md bg-white/20 text-white text-[10px] backdrop-blur-sm"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
