import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "HEYGEN_API_KEY が設定されていません" }, { status: 500 });
  }

  const { photoId, audioUrl, bgColor, bgType, bgImageUrl, dimension } = await req.json();

  if (!photoId) {
    return NextResponse.json({ error: "アバター画像をアップロードしてください" }, { status: 400 });
  }
  if (!audioUrl) {
    return NextResponse.json({ error: "音声URLがありません" }, { status: 400 });
  }

  const [width, height] = (dimension ?? "1280x720").split("x").map(Number);

  const body = {
    video_inputs: [
      {
        character: {
          type: "talking_photo",
          talking_photo_id: photoId,
        },
        voice: {
          type: "audio",
          audio_url: audioUrl,
        },
        background:
          bgType === "image" && bgImageUrl
            ? { type: "image", url: bgImageUrl }
            : { type: "color", value: bgColor ?? "#1a0a2e" },
      },
    ],
    dimension: { width, height },
    caption: false,
  };

  try {
    const res = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      let message = `HeyGen APIエラー (${res.status}): ${text.slice(0, 400)}`;
      try {
        const parsed = JSON.parse(text);
        const raw = parsed?.message ?? parsed?.error ?? parsed?.data?.message;
        if (raw != null) {
          message = typeof raw === "string" ? raw : JSON.stringify(raw);
        }
      } catch { /* ignore */ }
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const data = JSON.parse(text);
    const videoId = data?.data?.video_id ?? data?.video_id;
    return NextResponse.json({ videoId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "不明なエラー" },
      { status: 500 }
    );
  }
}
