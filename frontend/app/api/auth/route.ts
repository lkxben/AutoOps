import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL + "/register";

  const body = await req.text();

  const backendResponse = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "ngrok-skip-browser-warning": "true",
      "content-type": req.headers.get("content-type") || "application/json"
    },
    body
  });

  const data = await backendResponse.json();

  const response = NextResponse.json(data, { status: backendResponse.status });

  // const setCookie = backendResponse.headers.get("set-cookie");
  // if (setCookie) {
  //   setCookie.split(",").forEach(cookie => {
  //     response.cookies.set(cookie);
  //   });
  // }

  return response;
}