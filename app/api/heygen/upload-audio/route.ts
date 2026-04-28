export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "HEYGEN_API_KEY が設定されていません" }, { status: 500 });
  }

  try {
    const audioBuffer = await req.arrayBuffer();
    if (!audioBuffer.byteLength) {
      return NextResponse.json({ error: "音声データが空です" }, { status: 400 });
    }

    // HeyGen asset upload: raw binary with Content-Type
    const format = new URL(req.url).searchParams.get("format");
    const contentType = format === "wav" ? "audio/wav" : "audio/mpeg";
    const res = await fetch("https://upload.heygen.com/v1/asset", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey.trim(),
        "Content-Type": contentType,
      },
      body: new Uint8Array(audioBuffer),
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `HeyGen アップロードエラー (${res.status}): ${text.slice(0, 200)}` },
        { status: res.status }
      );
    }

    const data = JSON.parse(text);
    const audioUrl = data?.data?.url ?? data?.url;
    if (!audioUrl) {
      return NextResponse.json(
        { error: `URLが取得できませんでした: ${text.slice(0, 200)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ audioUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "不明なエラー" },
      { status: 500 }
    );
  }
}
