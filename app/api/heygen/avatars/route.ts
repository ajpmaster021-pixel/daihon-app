export const runtime = "edge";

import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return NextResponse.json({ error: "HEYGEN_API_KEY が設定されていません" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.heygen.com/v2/avatars?limit=50", {
      headers: { "X-Api-Key": apiKey.trim(), "Accept": "application/json" },
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: `HeyGen APIエラー (${res.status}): ${text.slice(0, 200)}` }, { status: res.status });
    }

    const json = JSON.parse(text);
    // レスポンス: { error: null, data: { avatars: [...] } }
    const avatars = json?.data?.avatars ?? [];
    return NextResponse.json({ avatars });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "不明なエラー" },
      { status: 500 }
    );
  }
}
