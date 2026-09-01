import { NextResponse } from "next/server";
import { removeDependency } from "@/server/actions";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await removeDependency(params.id);
  return NextResponse.json({ ok: true });
}
