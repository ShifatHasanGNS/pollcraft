import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  generateVisitorToken,
  getVisitorCookieName,
  registerVisitor,
} from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const visitorCookieName = getVisitorCookieName();
  const hadVisitorCookie = Boolean(cookieStore.get(visitorCookieName));

  const visitorToken =
    cookieStore.get(visitorCookieName)?.value ?? generateVisitorToken();

  const visitorCount = await registerVisitor(visitorToken);

  const response = NextResponse.json({
    visitorCount,
  });

  if (!hadVisitorCookie) {
    response.cookies.set({
      name: visitorCookieName,
      value: visitorToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  response.headers.set("Cache-Control", "no-store");

  return response;
}
