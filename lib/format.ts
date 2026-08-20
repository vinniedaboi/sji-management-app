import { format, formatDistanceToNow, isToday } from "date-fns";

export const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "St. Joseph's Institution International";
export const schoolLogoUrl = process.env.NEXT_PUBLIC_SCHOOL_LOGO_URL ?? "https://resources.finalsite.net/images/v1737511103/sjiinternationalcomsg/b5e2sg6iwtc63oze5upz/St-Josephs-Institution-International-Logo-White.svg";
export const schoolTimezone = process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE ?? "Asia/Singapore";
export const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
export const prettyDate = (value: string) => format(new Date(value), "d MMM yyyy");
export const prettyDateTime = (value: string) => format(new Date(value), isToday(new Date(value)) ? "p 'today'" : "d MMM, p");
export const relativeTime = (value: string) => formatDistanceToNow(new Date(value), { addSuffix: true });
export const snippet = (value: string, length = 130) => value.length > length ? `${value.slice(0, length).trim()}…` : value;
