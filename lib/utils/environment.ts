/**
 * Check if code is running on the server
 */
export const isServer = () => typeof window === "undefined"

/**
 * Check if code is running on the client
 */
export const isClient = () => !isServer()

/**
 * Safely access environment variables - only on the server
 * This prevents "cannot be accessed on the client" errors
 */
export const getServerEnv = (key: string): string | undefined => {
  if (isServer()) {
    return process.env[key]
  }
  return undefined
}

/**
 * Safely access public environment variables
 * These should be prefixed with NEXT_PUBLIC_
 */
export const getPublicEnv = (key: string): string | undefined => {
  // For public env vars, we can access them on both client and server
  if (key.startsWith("NEXT_PUBLIC_")) {
    return process.env[key]
  }

  // For non-public vars, only access on server
  if (isServer()) {
    return process.env[key]
  }

  return undefined
}
