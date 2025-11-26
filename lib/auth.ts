import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret')

export async function verifyAuth(token: string) {
  try {
    const verified = await jwtVerify(token, secret)
    return verified.payload
  } catch (err) {
    return null
  }
}

export function getCurrentUser() {
  // This will be populated from Replit Auth or your auth middleware
  return null
}
