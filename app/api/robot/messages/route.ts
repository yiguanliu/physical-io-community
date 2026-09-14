import { NextResponse } from 'next/server';
import { readPlaylist } from '@/lib/robot/playlist-store';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const playlist = await readPlaylist();
    return NextResponse.json({ messages: playlist.messages.filter(message => message.enabled) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ messages: [] }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
