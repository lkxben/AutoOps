import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function handler(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/proxyWithCookie", "");
  const backendUrl = process.env.NEXT_PUBLIC_API_URL + path;

  const cookieStore = await cookies();
  const authCookie = cookieStore.get("auth")?.value;

  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
  };

  if (authCookie) {
    headers["cookie"] = `auth=${authCookie}`;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    headers["content-type"] = req.headers.get("content-type") || "application/json";
  }

  const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined;

  const backendRes = await fetch(backendUrl, {
    method: req.method,
    headers,
    body,
  });

  const responseData = await backendRes.json();

  const response = new NextResponse(responseData, { status: backendRes.status });
  return response;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;