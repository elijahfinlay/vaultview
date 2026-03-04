import { encode } from "blurhash";

export function extractImageData(
  file: File
): Promise<{ width: number; height: number; blurhash: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 64 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const hash = encode(imageData.data, imageData.width, imageData.height, 4, 3);

      resolve({
        width: img.width,
        height: img.height,
        blurhash: hash,
      });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
