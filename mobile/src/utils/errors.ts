import { ApiError, NetworkError } from "@/api/http";

/**
 * Maps any thrown value to a single, user-safe sentence. Never surfaces stack
 * traces, backend internals, or raw error `details` to the UI.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return error.message;
  }
  if (error instanceof ApiError) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return "Your session expired. Please sign in again.";
      case "FORBIDDEN":
        return "You don't have access to that.";
      case "NOT_FOUND":
        return "We couldn't find that item.";
      case "SERVICE_UNAVAILABLE":
        return "AI scoring is temporarily unavailable. Try again shortly.";
      case "UPSTREAM_ERROR":
        return "An upstream service failed. Please try again.";
      case "REQUEST_TIMEOUT":
        return "The request timed out. Check your connection.";
      case "CONFLICT":
        return "That change conflicts with the current state. Refresh and retry.";
      default:
        // The backend messages are already sanitized and user-facing.
        return error.message || "Something went wrong. Please try again.";
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
