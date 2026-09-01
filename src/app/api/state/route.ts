import { NextResponse } from "next/server";
import { getState } from "@/server/actions";

export async function GET() {
  try {
    const state = await getState();
    return NextResponse.json(state);
  } catch (err) {
    console.error("GET /api/state failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
