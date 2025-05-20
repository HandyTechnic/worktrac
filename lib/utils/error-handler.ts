/**
 * Safely converts any error to a string
 */
export function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

/**
 * Logs an error with consistent formatting
 */
export function logError(context: string, message: string, error: unknown): void {
  console.error(`[${context}] ${message}:`, errorToString(error))
}

/**
 * Safely executes a function and handles any errors
 */
export async function safeExecute<T>(
  context: string,
  operation: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    logError(context, `Error during ${operation}`, error)
    return fallback
  }
}
