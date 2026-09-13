import { NextResponse } from "next/server";
import { getActivity } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const value = Number(new URL(request.url).searchParams.get("limit") ?? 100);
  return NextResponse.json(getActivity(value));
}
