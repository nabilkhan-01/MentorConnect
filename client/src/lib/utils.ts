import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string | undefined | null): string {
  if (!name) return "";
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffInDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
      `, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}

export function isAtRisk(attendance: number | undefined): boolean {
  if (attendance === undefined) return false;
  return attendance < 85;
}

export function calculateGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function formatPhoneNumber(phoneNumber: string | undefined | null): string {
  if (!phoneNumber) return "";
  
  // Basic formatting, can be adjusted for specific country formats
  if (phoneNumber.length === 10) {
    return phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  return phoneNumber;
}
