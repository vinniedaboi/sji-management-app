import { format, formatDistanceToNow, isToday } from "date-fns";

export const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "St. Joseph's Institution International";
export const schoolLogoUrl = process.env.NEXT_PUBLIC_SCHOOL_LOGO_URL ?? "https://resources.finalsite.net/images/v1737511103/sjiinternationalcomsg/b5e2sg6iwtc63oze5upz/St-Josephs-Institution-International-Logo-White.svg";
export const schoolTimezone = process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE ?? "Asia/Singapore";
export const schoolDate = (value = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: schoolTimezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
export const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
export const prettyDate = (value: string) => format(new Date(value), "d MMM yyyy");
export const prettyDateTime = (value: string) => format(new Date(value), isToday(new Date(value)) ? "p 'today'" : "d MMM, p");
export const relativeTime = (value: string) => formatDistanceToNow(new Date(value), { addSuffix: true });
export const snippet = (value: string, length = 130) => value.length > length ? `${value.slice(0, length).trim()}…` : value;

const markdownTableDivider = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;

export function markdownToPlainText(value: string) {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const plainLines = lines.flatMap((line) => {
    let clean = line.trim();
    if (!clean || /^(```|~~~)/.test(clean) || markdownTableDivider.test(clean)) return [];

    clean = clean
      .replace(/^#{1,6}\s+/, "")
      .replace(/^>\s?/, "")
      .replace(/^[-+*]\s+/, "")
      .replace(/^\d+[.)]\s+/, "");

    if (clean.startsWith("|") && clean.endsWith("|")) {
      clean = clean.slice(1, -1).split("|").map((cell) => cell.trim()).filter(Boolean).join(" · ");
    }

    return clean ? [clean] : [];
  });

  return plainLines.join(" ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<(https?:\/\/[^>]+|mailto:[^>]+)>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\([\\`*_[\]{}()#+\-.!|>~])/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const markdownSnippet = (value: string, length = 130) => snippet(markdownToPlainText(value), length);
