import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL + "/auth/me";
  const cookieHeader = req.headers.get("cookie") || "";
  const backendRes = await fetch(backendUrl, {
    headers: {
      "ngrok-skip-browser-warning": "true",
      cookie: cookieHeader,
    },
  });

  const data = await backendRes.json();

  return NextResponse.json(data, { status: backendRes.status });
}