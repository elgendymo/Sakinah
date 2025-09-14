import { clsx, type ClassValue } from 'clsx';

/**
 * Utility function to merge class names with clsx
 * This is a pure function that can be used in both server and client components
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}