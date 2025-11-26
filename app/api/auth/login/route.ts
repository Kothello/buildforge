import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Placeholder for Replit Auth login
  // In production, this will use the Replit Auth integration
  return NextResponse.redirect(new URL('/login', request.url))
}
