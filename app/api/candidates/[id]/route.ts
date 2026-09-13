import { NextResponse } from "next/server";
import { changeStatus, getCandidate, overrideScore } from "@/lib/repository";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const candidate = getCandidate(id);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  return NextResponse.json(candidate);
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  try {
    const body = (await request.json()) as { type?: string; scoreKey?: string; score?: number; reason?: string; status?: string };
    if (body.type === "score_override") {
      return NextResponse.json(overrideScore(id, body.scoreKey ?? "", Number(body.score), body.reason ?? ""));
    }
    if (body.type === "status") {
      return NextResponse.json(changeStatus(id, body.status ?? "", body.reason));
    }
    return NextResponse.json({ error: "Unsupported mutation" }, { status: 400 });
  } catch (error) {
    return errorResponse(error, "Unable to update candidate");
  }
}
