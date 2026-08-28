/**
 * Saving a generated file from the browser, with the WebKit quirks handled.
 *
 * Safari breaks the naive `<a download href="data:...">` trick in two ways:
 *   1. the `download` attribute is ignored for `data:` URLs, so the click
 *      either does nothing or navigates away;
 *   2. downloads from a `blob:` URL are queued asynchronously, so revoking
 *      the object URL in the same tick cancels the download silently.
 *
 * On phones a download also lands in the Files app rather than the photo
 * library, so raster images go through the OS share sheet first — on iOS that
 * offers "Save Image", which is what people actually want.
 */

export type SaveOutcome = "shared" | "downloaded" | "opened";

/** Long enough for WebKit to pick the blob up, short enough not to leak. */
const REVOKE_DELAY_MS = 60_000;

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports a desktop UA, so fall back to the touch-point count.
  const isIos = /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return isIos || /Android/.test(ua);
}

function canShareFile(file: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  );
}

/** Promise wrapper for canvas.toBlob, falling back to the data URL on old engines. */
export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== "function") {
      try {
        resolve(dataUrlToBlob(canvas.toDataURL(type, quality)));
      } catch (e) {
        reject(e);
      }
      return;
    }
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null"))),
      type,
      quality,
    );
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(",");
  const type = /:(.*?);/.exec(header)?.[1] ?? "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/**
 * Hand `blob` to the user as `filename`. Prefers the share sheet on phones so
 * images can go straight to the photo library, and falls back to a download.
 */
export async function saveBlob(blob: Blob, filename: string): Promise<SaveOutcome> {
  const type = blob.type || "application/octet-stream";
  const file = new File([blob], filename, { type });
  // Strip any ";charset=..." suffix before comparing.
  const mime = type.split(";")[0].trim().toLowerCase();
  const isImage = mime.startsWith("image/") && mime !== "image/svg+xml";

  // The photo library only takes raster images, so SVG always downloads.
  if (isImage && isMobileDevice() && canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (err) {
      // Dismissing the sheet is a choice, not a failure — don't then shove a
      // download at the user. Anything else falls through to the download.
      if ((err as DOMException | undefined)?.name === "AbortError") return "shared";
    }
  }

  const url = URL.createObjectURL(blob);
  const revoke = () => setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  const a = document.createElement("a");

  // iOS Safari before 13 has no download attribute at all; showing the image
  // lets the user long-press it and add it to Photos by hand.
  if (!("download" in a)) {
    window.open(url, "_blank");
    revoke();
    return "opened";
  }

  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  revoke();
  return "downloaded";
}
