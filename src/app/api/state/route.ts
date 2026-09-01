import { NextResponse } from "next/server";
import { getState } from "@/server/actions";

export async function GET() {
  const state = await getState();
  return NextResponse.json(state);
}
