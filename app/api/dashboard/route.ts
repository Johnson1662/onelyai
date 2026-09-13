import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode") === "demo" ? "demo" : "real";
  return NextResponse.json(getDashboard(mode));
}
