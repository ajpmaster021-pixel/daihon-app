export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "HEYGEN_API_KEY が設定されていません" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 });
    }
    if (!file.size) {
      return NextResponse.json({ error: "画像データが空です" }, { status: 400 });
    }

    // Step 1: Upload image to HeyGen CDN
    const buffer = await file.arrayBuffer();
    const uploadRes = await fetch("https://upload.heygen.com/v1/asset", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey.trim(),
        "Content-Type": file.type || "image/jpeg",
      },
      body: new Uint8Array(buffer),
    });

    const uploadText = await uploadRes.text();
    if (!uploadRes.ok) {
      return NextResponse.json(
        { error: `画像アップロードエラー (${uploadRes.status}): ${uploadText.slice(0, 300)}` },
        { status: uploadRes.status }
      );
    }

    const uploadData = JSON.parse(uploadText);
    const imageUrl = uploadData?.data?.url ?? uploadData?.url;
    if (!imageUrl) {
      return NextResponse.json(
        { error: `画像URLが取得できませんでした: ${uploadText.slice(0, 200)}` },
        { status: 500 }
      );
    }

    // Step 2: Create photo avatar via direct upload endpoint
    const photoForm = new FormData();
    photoForm.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: file.type || "image/jpeg" }),
      file.name || "avatar.jpg"
    );
    photoForm.append("name", `custom_${Date.now()}`);

    const photoRes = await fetch("https://api.heygen.com/v2/photo_avatar/photo/upload", {
      method: "POST",
      headers: { "X-Api-Key": apiKey.trim() },
      body: photoForm,
    });

    const photoText = await photoRes.text();
    if (!photoRes.ok) {
      return NextResponse.json(
        { error: `フォトアバター作成エラー (${photoRes.status}): ${photoText.slice(0, 300)}` },
        { status: photoRes.status }
      );
    }

    const photoData = JSON.parse(photoText);
    const photoAvatarId =
      photoData?.data?.photo_avatar_id ??
      photoData?.data?.id ??
      photoData?.photo_avatar_id ??
      photoData?.id;

    if (!photoAvatarId) {
      return NextResponse.json(
        { error: `フォトアバターIDが取得できませんでした: ${photoText.slice(0, 300)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ photoAvatarId, imageUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "不明なエラー" },
      { status: 500 }
    );
  }
}
