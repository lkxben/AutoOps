import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/proxySetCookie", "");
  const backendUrl = process.env.NEXT_PUBLIC_API_URL + path;
  const body = await req.text();

  const backendRes = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") || "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body,
  });

  const data = await backendRes.json();
  const setCookieHeader = backendRes.headers.get("set-cookie");
  const response = NextResponse.json(data, { status: backendRes.status });

  if (setCookieHeader) {
    const match = setCookieHeader.match(/auth=([^;]+);/);
    if (match) {
      const token = match[1];
      const cookieStore = await cookies();
      cookieStore.set({
        name: "auth",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        domain: undefined,
        maxAge: 7 * 24 * 60 * 60,
      });
    }
  }

  return response;
}