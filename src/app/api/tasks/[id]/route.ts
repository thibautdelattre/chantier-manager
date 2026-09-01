import { NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/server/actions";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const patch = await req.json();
  try {
    const task = await updateTask(params.id, patch);
    return NextResponse.json(task);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await deleteTask(params.id);
  return NextResponse.json({ ok: true });
}
