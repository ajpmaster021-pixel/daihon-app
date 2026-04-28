import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "HEYGEN_API_KEY が設定されていません" }, { status: 500 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "idが必要です" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.heygen.com/v2/photo_avatar/${id}`, {
      headers: {
        "X-Api-Key": apiKey.trim(),
        "Accept": "application/json",
      },
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `ステータス確認エラー (${res.status}): ${text.slice(0, 200)}` },
        { status: res.status }
      );
    }

    const data = JSON.parse(text);
    // レスポンス全体を返して状態を確認できるようにする
    const status: string = data?.data?.status ?? data?.status ?? "processing";
    const lookId: string | null =
      data?.data?.look_id ??
      data?.data?.looks?.[0]?.look_id ??
      data?.data?.looks?.[0]?.id ??
      null;

    return NextResponse.json({ status, lookId, raw: data?.data ?? data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "不明なエラー" },
      { status: 500 }
    );
  }
}
