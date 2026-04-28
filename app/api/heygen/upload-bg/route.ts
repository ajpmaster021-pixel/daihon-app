import { NextRequest, NextResponse } from "next/server";

/** 背景画像をHeyGen CDNにアップロードしてURLを返す */
export async function POST(req: NextRequest) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "HEYGEN_API_KEY が設定されていません" }, { status: 500 });
  }

  try {
    const contentType = req.headers.get("content-type") || "image/jpeg";
    const buffer = await req.arrayBuffer();
    if (!buffer.byteLength) {
      return NextResponse.json({ error: "画像データが空です" }, { status: 400 });
    }

    const res = await fetch("https://upload.heygen.com/v1/asset", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey.trim(),
        "Content-Type": contentType,
      },
      body: new Uint8Array(buffer),
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `背景画像アップロードエラー (${res.status}): ${text.slice(0, 200)}` },
        { status: res.status }
      );
    }

    const data = JSON.parse(text);
    const url = data?.data?.url ?? data?.url;
    if (!url) {
      return NextResponse.json(
        { error: `URLが取得できませんでした: ${text.slice(0, 200)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "不明なエラー" },
      { status: 500 }
    );
  }
}
