import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Re-export type utilities from bits-ui for shadcn-svelte components
export type {
	WithElementRef,
	WithoutChildren,
	WithoutChild,
	WithoutChildrenOrChild,
} from "bits-ui";
