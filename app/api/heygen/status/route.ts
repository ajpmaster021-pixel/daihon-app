export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "HEYGEN_API_KEY が設定されていません" }, { status: 500 });
  }

  const videoId = req.nextUrl.searchParams.get("videoId");
  if (!videoId) {
    return NextResponse.json({ error: "videoId が必要です" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
    { headers: { "X-Api-Key": apiKey } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: `HeyGen API エラー (${res.status})` }, { status: res.status });
  }

  const data = await res.json();
  const info = data?.data ?? {};

  return NextResponse.json({
    status: info.status,         // pending | processing | completed | failed
    videoUrl: info.video_url,
    thumbnailUrl: info.thumbnail_url,
    duration: info.duration,
    failureMessage: info.msg,
  });
}
