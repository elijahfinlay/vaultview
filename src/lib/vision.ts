import { ImageAnnotatorClient } from "@google-cloud/vision";

let client: ImageAnnotatorClient | null = null;

function getClient() {
  if (client) return client;

  const creds = process.env.GOOGLE_CLOUD_CREDENTIALS;
  if (!creds) {
    throw new Error("GOOGLE_CLOUD_CREDENTIALS not set");
  }

  const credentials = JSON.parse(Buffer.from(creds, "base64").toString());
  client = new ImageAnnotatorClient({ credentials });
  return client;
}

export interface VisionResult {
  labels: string[];
  description: string;
  colors: string[];
  text: string;
  safeSearch: Record<string, string>;
}

export async function analyzeImage(imageUrl: string): Promise<VisionResult> {
  const visionClient = getClient();

  const [result] = await visionClient.annotateImage({
    image: { source: { imageUri: imageUrl } },
    features: [
      { type: "LABEL_DETECTION", maxResults: 15 },
      { type: "IMAGE_PROPERTIES" },
      { type: "TEXT_DETECTION" },
      { type: "SAFE_SEARCH_DETECTION" },
    ],
  });

  const labels =
    result.labelAnnotations?.map((l) => l.description || "").filter(Boolean) ||
    [];

  const colors =
    result.imagePropertiesAnnotation?.dominantColors?.colors
      ?.slice(0, 5)
      .map((c) => {
        const r = Math.round(c.color?.red || 0);
        const g = Math.round(c.color?.green || 0);
        const b = Math.round(c.color?.blue || 0);
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      }) || [];

  const text =
    result.textAnnotations?.[0]?.description?.slice(0, 1000) || "";

  const safeSearch: Record<string, string> = {};
  if (result.safeSearchAnnotation) {
    const ss = result.safeSearchAnnotation;
    if (ss.adult) safeSearch.adult = String(ss.adult);
    if (ss.violence) safeSearch.violence = String(ss.violence);
    if (ss.racy) safeSearch.racy = String(ss.racy);
  }

  // Build a natural description from top labels
  const description = labels.length > 0
    ? `Image containing ${labels.slice(0, 5).join(", ").toLowerCase()}`
    : "Image";

  return { labels, description, colors, text, safeSearch };
}

// Map AI labels to predefined categories
const CATEGORY_MAP: Record<string, string[]> = {
  Nature: ["nature", "landscape", "mountain", "forest", "ocean", "sky", "sunset", "sunrise", "flower", "tree", "water", "beach", "river", "lake", "cloud"],
  People: ["person", "people", "face", "portrait", "crowd", "selfie", "smile", "human"],
  Animals: ["animal", "dog", "cat", "bird", "fish", "wildlife", "pet", "insect"],
  Food: ["food", "meal", "dish", "cooking", "baking", "fruit", "vegetable", "restaurant", "dessert", "drink", "cuisine"],
  Architecture: ["building", "architecture", "house", "church", "bridge", "tower", "city", "street", "skyscraper"],
  Art: ["art", "painting", "drawing", "sculpture", "design", "illustration", "mural", "graffiti"],
  Travel: ["travel", "tourism", "landmark", "monument", "temple", "castle", "ruins", "resort"],
  Technology: ["computer", "phone", "technology", "electronics", "screen", "device", "robot", "gadget"],
  Sports: ["sport", "fitness", "exercise", "ball", "game", "athletic", "running", "swimming"],
  Vehicles: ["car", "vehicle", "motorcycle", "bicycle", "airplane", "boat", "train", "truck"],
};

export function categorizeLables(labels: string[]): string[] {
  const matched = new Set<string>();
  const lowerLabels = labels.map((l) => l.toLowerCase());

  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const keyword of keywords) {
      if (lowerLabels.some((l) => l.includes(keyword))) {
        matched.add(category);
        break;
      }
    }
  }

  return Array.from(matched);
}
