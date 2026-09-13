import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  const { id } = await params;
  return NextResponse.json({ discoveryId: Number(id), next: `/candidates/new?discoveryId=${encodeURIComponent(id)}` });
}
