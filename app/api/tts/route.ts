import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text, voiceId } = await req.json();

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === "your_elevenlabs_api_key_here") {
    return NextResponse.json(
      { error: "ElevenLabs APIキーが設定されていません。.env.local を確認してください。" },
      { status: 500 }
    );
  }

  if (!text?.trim()) {
    return NextResponse.json({ error: "テキストが空です。" }, { status: 400 });
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        voice_settings: {
          stability: 1.0,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    let message = `ElevenLabs APIエラー (${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed?.detail?.message ?? parsed?.detail ?? message;
    } catch {
      // use default message
    }
    return NextResponse.json({ error: message }, { status: response.status });
  }

  const audioBuffer = await response.arrayBuffer();
  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
    },
  });
}
