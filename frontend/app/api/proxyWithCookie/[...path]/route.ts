import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function handler(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/proxyWithCookie", "");
  const backendUrl = process.env.NEXT_PUBLIC_API_URL + path + req.nextUrl.search;

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

  if (backendRes.status === 204 || backendRes.status === 205) {
    return new NextResponse(null, { status: backendRes.status });
  }

  if (path === "/logout") {
    const response = NextResponse.json({ success: backendRes.ok }, { status: backendRes.status });
    response.headers.set(
      "Set-Cookie",
      "auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" + 
        (process.env.NODE_ENV === "production" ? "; Secure" : "")
    );
    return response
  }

  let responseData: any;
  const contentType = backendRes.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      responseData = await backendRes.json();
    } catch {
      responseData = {};
    }
  } else {
    responseData = await backendRes.text();
  }

  const response = contentType.includes("application/json")
    ? NextResponse.json(responseData, { status: backendRes.status })
    : new NextResponse(responseData, { status: backendRes.status });

  return response;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;