import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const targetUrl = 'https://inland-grete-mondefense-9eee18bb.koyeb.app/api/csrf-token';

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}
