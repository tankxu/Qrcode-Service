// SSR locale handling for /q/:slug landing pages.

export const SUPPORTED = ["en", "zh", "ja", "ko", "vi", "de", "fr"] as const;
export type Locale = (typeof SUPPORTED)[number];

const COOKIE = "qr_locale";

function normalize(input: string): Locale | null {
  const v = input.trim();
  if (!v) return null;
  // Exact match
  if ((SUPPORTED as readonly string[]).includes(v)) return v as Locale;
  // zh-* (zh-CN, zh-Hans, zh-TW...) → zh (we only ship Simplified Chinese for MVP)
  const lower = v.toLowerCase();
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("ko")) return "ko";
  if (lower.startsWith("vi")) return "vi";
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("en")) return "en";
  return null;
}

export function pickLocale(req: Request): Locale {
  // 1. Explicit cookie
  const cookieHeader = req.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === COOKIE && v) {
      const decoded = decodeURIComponent(v);
      const found = normalize(decoded);
      if (found) return found;
    }
  }
  // 2. Accept-Language (parse quality, take best supported)
  const al = req.headers.get("accept-language") || "";
  const candidates = al
    .split(",")
    .map((p) => {
      const [tag, qPart] = p.trim().split(";");
      const q = qPart && qPart.startsWith("q=") ? parseFloat(qPart.slice(2)) : 1;
      return { tag: tag || "", q: isNaN(q) ? 1 : q };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of candidates) {
    const found = normalize(tag);
    if (found) return found;
  }
  return "en";
}

export interface Strings {
  longPress: string;
  poweredBy: string;
  urlGoingTo: string;
  urlContinue: string;
  urlAuto: string;
  errNotFoundTitle: string;
  errNotFoundBody: string;
  errPausedTitle: string;
  errPausedBody: string;
  errDeletedTitle: string;
  errDeletedBody: string;
  visitHome: string;
}

const STRINGS: Record<Locale, Strings> = {
  en: {
    longPress: "Long-press the image to save",
    poweredBy: "Powered by QuickQR",
    urlGoingTo: "You're heading to",
    urlContinue: "Continue",
    urlAuto: "Auto-redirecting in 1.5 seconds...",
    errNotFoundTitle: "QR not found",
    errNotFoundBody: "This code may be invalid or no longer exists.",
    errPausedTitle: "Temporarily unavailable",
    errPausedBody: "The owner has paused this QR. Check back later.",
    errDeletedTitle: "Content removed",
    errDeletedBody: "The owner has removed this QR.",
    visitHome: "Visit QuickQR",
  },
  "zh": {
    longPress: "长按图片保存到相册,或在微信中长按识别二维码",
    poweredBy: "由 QuickQR 提供",
    urlGoingTo: "即将前往",
    urlContinue: "继续",
    urlAuto: "1.5 秒后自动跳转……",
    errNotFoundTitle: "二维码不存在",
    errNotFoundBody: "可能链接无效或已被移除。",
    errPausedTitle: "暂时不可用",
    errPausedBody: "所有者暂停了此二维码,稍后再试。",
    errDeletedTitle: "内容已下线",
    errDeletedBody: "所有者已移除此二维码。",
    visitHome: "访问 QuickQR",
  },
  ja: {
    longPress: "画像を長押しして保存",
    poweredBy: "Powered by QuickQR",
    urlGoingTo: "次のページへ移動します",
    urlContinue: "続ける",
    urlAuto: "1.5 秒後に自動でリダイレクトします…",
    errNotFoundTitle: "QR が見つかりません",
    errNotFoundBody: "コードが無効か、既に削除された可能性があります。",
    errPausedTitle: "一時的に利用できません",
    errPausedBody: "所有者がこの QR を停止中です。後ほどご確認ください。",
    errDeletedTitle: "コンテンツが削除されました",
    errDeletedBody: "所有者がこの QR を削除しました。",
    visitHome: "QuickQR を見る",
  },
  ko: {
    longPress: "이미지를 길게 눌러 저장",
    poweredBy: "Powered by QuickQR",
    urlGoingTo: "이동합니다",
    urlContinue: "계속",
    urlAuto: "1.5초 후 자동으로 이동합니다...",
    errNotFoundTitle: "QR을 찾을 수 없습니다",
    errNotFoundBody: "코드가 유효하지 않거나 삭제되었을 수 있습니다.",
    errPausedTitle: "일시적으로 사용할 수 없음",
    errPausedBody: "소유자가 이 QR을 일시중지했습니다. 나중에 다시 시도하세요.",
    errDeletedTitle: "콘텐츠 삭제됨",
    errDeletedBody: "소유자가 이 QR을 삭제했습니다.",
    visitHome: "QuickQR 방문",
  },
  vi: {
    longPress: "Nhấn giữ ảnh để lưu",
    poweredBy: "Cung cấp bởi QuickQR",
    urlGoingTo: "Bạn sắp đến",
    urlContinue: "Tiếp tục",
    urlAuto: "Tự động chuyển hướng sau 1,5 giây...",
    errNotFoundTitle: "Không tìm thấy QR",
    errNotFoundBody: "Mã có thể không hợp lệ hoặc đã bị xóa.",
    errPausedTitle: "Tạm thời không khả dụng",
    errPausedBody: "Chủ sở hữu đã tạm dừng QR này. Hãy quay lại sau.",
    errDeletedTitle: "Đã gỡ nội dung",
    errDeletedBody: "Chủ sở hữu đã gỡ QR này.",
    visitHome: "Đến QuickQR",
  },
  de: {
    longPress: "Bild gedrückt halten zum Speichern",
    poweredBy: "Powered by QuickQR",
    urlGoingTo: "Du wirst weitergeleitet zu",
    urlContinue: "Weiter",
    urlAuto: "Automatische Weiterleitung in 1,5 Sekunden...",
    errNotFoundTitle: "QR nicht gefunden",
    errNotFoundBody: "Dieser Code ist möglicherweise ungültig oder wurde entfernt.",
    errPausedTitle: "Vorübergehend nicht verfügbar",
    errPausedBody: "Der Besitzer hat diesen QR pausiert. Bitte später erneut versuchen.",
    errDeletedTitle: "Inhalt entfernt",
    errDeletedBody: "Der Besitzer hat diesen QR entfernt.",
    visitHome: "QuickQR besuchen",
  },
  fr: {
    longPress: "Appuyer longuement sur l'image pour la sauvegarder",
    poweredBy: "Propulsé par QuickQR",
    urlGoingTo: "Vous allez vers",
    urlContinue: "Continuer",
    urlAuto: "Redirection automatique dans 1,5 seconde...",
    errNotFoundTitle: "QR introuvable",
    errNotFoundBody: "Ce code est peut-être invalide ou a été supprimé.",
    errPausedTitle: "Temporairement indisponible",
    errPausedBody: "Le propriétaire a mis ce QR en pause. Réessayez plus tard.",
    errDeletedTitle: "Contenu supprimé",
    errDeletedBody: "Le propriétaire a supprimé ce QR.",
    visitHome: "Visiter QuickQR",
  },
};

export const strings = (l: Locale): Strings => STRINGS[l];

// HTML lang attribute mapping (e.g. "zh" stays as-is)
export const htmlLang = (l: Locale): string => l;
