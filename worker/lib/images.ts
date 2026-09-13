import type { TargetInput } from "./schemas";
import type { Bindings } from "../index";
import { newId } from "./ids";

export async function validateImageTarget(
  env: Bindings,
  uid: string,
  target?: TargetInput,
) {
  if (target?.type !== "image") return true;
  const { r2_key, mime } = target.payload;
  if (!r2_key.startsWith(`images/${uid}/`) || r2_key.includes(".."))
    return false;
  const object = await env.IMAGES.head(r2_key);
  return !!object && object.httpMetadata?.contentType === mime;
}
export async function saveImage(env: Bindings, uid: string, file: File) {
  if (!file.size || file.size > 2 * 1024 * 1024) throw new Error("image_size");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime: "image/png" | "image/jpeg" | "image/webp" | null =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
      ? "image/png"
      : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        ? "image/jpeg"
        : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
          ? "image/webp"
          : null;
  if (
    !mime ||
    (file.type &&
      file.type !== "application/octet-stream" &&
      file.type !== mime)
  )
    throw new Error("image_type");
  const key = `images/${uid}/${newId()}.${mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp"}`;
  await env.IMAGES.put(key, bytes, { httpMetadata: { contentType: mime } });
  return { r2_key: key, mime, size: file.size, public_url: `/r/${key}` };
}
