import { NextResponse } from "next/server";
import { loadDemoFunnel } from "@/lib/repository";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(loadDemoFunnel());
}
