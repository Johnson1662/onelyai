import { NextResponse } from "next/server";
import { previewImport } from "@/lib/repository";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    if (file.size > 2_000_000) return NextResponse.json({ error: "CSV must be smaller than 2 MB" }, { status: 400 });
    return NextResponse.json(previewImport(await file.text()));
  } catch (error) {
    return errorResponse(error, "Unable to preview CSV");
  }
}
