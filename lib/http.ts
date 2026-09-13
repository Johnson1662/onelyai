import { NextResponse } from "next/server";

export function errorResponse(error: unknown, fallback = "Request failed") {
  const message = error instanceof Error ? error.message : fallback;
  const status = /not found/i.test(message) ? 404 : /may only|must be|required|invalid|unknown|unsupported|duplicate/i.test(message) ? 400 : 500;
  return NextResponse.json({ error: message }, { status });
}
