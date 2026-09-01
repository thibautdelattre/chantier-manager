import { NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/server/actions";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const patch = await req.json();
    const task = await updateTask(params.id, patch);
    return NextResponse.json(task);
  } catch (err) {
    console.error(`PATCH /api/tasks/${params.id} failed:`, err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteTask(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/tasks/${params.id} failed:`, err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
