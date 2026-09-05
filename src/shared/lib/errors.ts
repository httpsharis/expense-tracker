import { isClerkAPIResponseError } from "@clerk/expo";

/**
 * Extracts a clean, human-readable error message without using `any`.
 */
export function getErrorMessage(err: unknown): string {
  // 1. Check if the error originates from Clerk's API
  if (isClerkAPIResponseError(err)) {
    // Clerk returns an array of ClerkAPIError objects
    const firstError = err.errors[0];
    return firstError?.longMessage || firstError?.message || "Authentication failed.";
  }

  // 2. Check for standard JavaScript Error instances
  if (err instanceof Error) {
    return err.message;
  }

  // 3. Fallback for primitive or unknown errors
  if (typeof err === "string") {
    return err;
  }

  return "An unexpected error occurred. Please try again.";
}