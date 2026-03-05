import { del } from "@vercel/blob";

export async function deleteFromStorage(url: string) {
  await del(url);
}
