import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL + "/register";
  const body = await req.text();

  const backendRes = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") || "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body,
  });

  const setCookieHeader = backendRes.headers.get("set-cookie");
  const response = NextResponse.json({ success: backendRes.ok });

  if (setCookieHeader) {
    const match = setCookieHeader.match(/auth=([^;]+);/);
    if (match) {
      const token = match[1];
      const cookieStore = await cookies();
      cookieStore.set({
        name: "auth",
        value: token,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        path: "/",
        domain: undefined,
        maxAge: 7 * 24 * 60 * 60,
      });
    }
  }

  return response;
}