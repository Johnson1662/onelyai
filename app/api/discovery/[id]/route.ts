import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { markDiscoveryReview } from "@/lib/repository";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: "reviewing" | "qualified" | "rejected" };
    if (!body.status) return NextResponse.json({ error: "Status is required" }, { status: 400 });
    const item = markDiscoveryReview(Number(id), body.status);
    if (!item) return NextResponse.json({ error: "Discovery item not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    return errorResponse(error, "Unable to update discovery item");
  }
}
