import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a human-readable cafe session code like CAFE-9X2K3 */
export function generateCafeSessionCode(): string {
  // Exclude ambiguous characters: O/0/I/1/L
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "CAFE-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
