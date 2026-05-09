import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind class composition with merge — drop-in shadcn pattern.
 *  Conditional classes via clsx, conflict resolution via twMerge. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
