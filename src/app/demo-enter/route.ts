import { NextRequest, NextResponse } from "next/server";
import { startDemoSession } from "@/lib/auth-access";

export async function GET(request: NextRequest) {
  await startDemoSession("manager");
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
