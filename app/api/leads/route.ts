import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // TODO: Implement Supabase integration
  return NextResponse.json({ data: [] })
}

export async function POST(request: NextRequest) {
  // TODO: Implement lead creation with Supabase
  return NextResponse.json({ data: {} }, { status: 201 })
}
