import { isClerkAPIResponseError } from "@clerk/expo";

/**
 * Extracts a clean, human-readable error message without using `any`.
 */
export function getErrorMessage(
  err: unknown,
  fallback = "An unexpected error occurred. Please try again.",
): string {
  // 1. Check if the error originates from Clerk's API
  if (isClerkAPIResponseError(err)) {
    // Clerk returns an array of ClerkAPIError objects
    const firstError = err.errors[0];
    return firstError?.longMessage || firstError?.message || "Authentication failed.";
  }

  // 2. Check for standard JavaScript Error instances
  if (err instanceof Error) {
    const rawMsg = err.message;
    if (typeof rawMsg === "string" && rawMsg.trim() && rawMsg !== "[object Object]") {
      if (rawMsg.toLowerCase().includes("permission denied for table")) {
        return "Database permission denied for table transactions. Please run the schema grants SQL in your Supabase SQL editor.";
      }
      return rawMsg;
    }
    // Check if error has a cause or nested properties
    const withCause = err as { cause?: unknown };
    if (typeof withCause.cause === "string" && withCause.cause !== "[object Object]") {
      return withCause.cause;
    }
  }

  // 3. Check for API / Supabase / Gemini error objects with nested structures
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;

    // Case A: { message: "..." }
    if (typeof obj.message === "string" && obj.message.trim() && obj.message !== "[object Object]") {
      if (obj.message.toLowerCase().includes("permission denied for table")) {
        return "Database permission denied for table transactions. Please run the schema grants SQL in your Supabase SQL editor.";
      }
      return obj.message;
    }

    // Case B: { error: "..." } or { error: { message: "..." } }
    if (obj.error) {
      if (typeof obj.error === "string" && obj.error.trim() && obj.error !== "[object Object]") {
        return obj.error;
      }
      if (typeof obj.error === "object" && obj.error !== null) {
        const nestedErr = obj.error as Record<string, unknown>;
        if (typeof nestedErr.message === "string" && nestedErr.message.trim()) {
          return nestedErr.message;
        }
      }
    }

    // Case C: { details: "..." }
    if (typeof obj.details === "string" && obj.details.trim()) {
      return obj.details;
    }
  }

  // 4. Fallback for primitive string errors
  if (typeof err === "string" && err.trim().length > 0 && err !== "[object Object]") {
    return err;
  }

  return fallback;
}