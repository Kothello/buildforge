import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // TODO: Implement Replit Auth session retrieval
  return NextResponse.json({ user: null }, { status: 401 })
}
