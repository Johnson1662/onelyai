import { NextResponse } from "next/server";
import { createCandidate, listCandidates } from "@/lib/repository";
import { buildManualRecord } from "@/lib/manual";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const numberParam = (key: string) => {
    const value = url.searchParams.get(key);
    return value === null || value === "" ? undefined : Number(value);
  };
  const result = listCandidates({
    search: url.searchParams.get("search") || undefined,
    segmentGroup: url.searchParams.get("segmentGroup") || undefined,
    priority: url.searchParams.get("priority") || undefined,
    verification: url.searchParams.get("verification") || undefined,
    funnelStatus: url.searchParams.get("funnelStatus") || undefined,
    outreachStatus: url.searchParams.get("outreachStatus") || undefined,
    aiAffinity: url.searchParams.get("aiAffinity") || undefined,
    hasEmail: url.searchParams.get("hasEmail") === "true",
    fitMin: numberParam("fitMin"),
    fitMax: numberParam("fitMax"),
    activationMin: numberParam("activationMin"),
    activationMax: numberParam("activationMax"),
    networkMin: numberParam("networkMin"),
    networkMax: numberParam("networkMax"),
    sort: (url.searchParams.get("sort") as "priority" | "fit" | "activation" | "network" | "name" | null) ?? "priority",
    order: (url.searchParams.get("order") as "asc" | "desc" | null) ?? "desc",
    page: numberParam("page"),
    pageSize: numberParam("pageSize"),
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const { record, discoveryId } = buildManualRecord(input);
    return NextResponse.json(createCandidate(record, discoveryId), { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to create candidate");
  }
}
