import { NextResponse } from "next/server";
import { resetDemoFunnel } from "@/lib/repository";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(resetDemoFunnel());
}
