import { NextResponse } from "next/server";
import { assignMember, unassignMember, AssignmentError } from "@/server/actions";

export async function POST(req: Request) {
  try {
    const { taskId, memberId } = await req.json();
    await assignMember(taskId, memberId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/assignments failed:", err);
    if (err instanceof AssignmentError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { taskId, memberId } = await req.json();
    await unassignMember(taskId, memberId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/assignments failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
