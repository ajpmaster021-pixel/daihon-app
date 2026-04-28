export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.APP_PASSWORD;

  if (!correct || password !== correct) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth_session", correct, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7日間
  });
  return res;
}
