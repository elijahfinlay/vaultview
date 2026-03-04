"use client";

import { useEffect, useRef } from "react";
import { decode } from "blurhash";

export function BlurhashPlaceholder({
  hash,
  width,
  height,
  className,
}: {
  hash: string;
  width: number;
  height: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const pixels = decode(hash, width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Invalid hash — fail silently
    }
  }, [hash, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ imageRendering: "auto" }}
    />
  );
}
