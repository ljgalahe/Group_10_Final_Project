import { createDataClient } from "@/lib/auth-access";

export const SUPPORT_PHOTOS_BUCKET = "support-photos";

const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function supportPhotoPublicUrl(path: string | null | undefined) {
  if (!path?.trim()) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${SUPPORT_PHOTOS_BUCKET}/${path}`;
}

export async function uploadSupportPhoto(
  customerId: string,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  if (!file || file.size === 0) {
    return { path: null, error: null };
  }
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return {
      path: null,
      error: "Please upload a JPG, PNG, WEBP, or GIF photo.",
    };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { path: null, error: "Photo must be 5 MB or smaller." };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";
  const path = `${customerId}/${crypto.randomUUID()}.${ext}`;
  const supabase = await createDataClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(SUPPORT_PHOTOS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return {
      path: null,
      error: error.message || "Could not upload photo. Please try again.",
    };
  }

  return { path, error: null };
}
