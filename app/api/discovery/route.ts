import { NextResponse } from "next/server";
import { addDiscovery, listDiscovery, markDiscoveryReview } from "@/lib/repository";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listDiscovery());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; source?: string; query?: string; notes?: string; status?: "reviewing" | "qualified" | "rejected"; id?: number };
    if (body.status && body.id) return NextResponse.json(markDiscoveryReview(Number(body.id), body.status));
    if (!body.url?.trim() || !body.source?.trim()) return NextResponse.json({ error: "URL and source are required" }, { status: 400 });
    return NextResponse.json(addDiscovery({ url: body.url, source: body.source, query: body.query, notes: body.notes }), { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save discovery item");
  }
}
