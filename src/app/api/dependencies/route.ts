import { NextResponse } from "next/server";
import { addDependency, CycleError } from "@/server/actions";

export async function POST(req: Request) {
  const body = await req.json();
  const { taskId, dependsOnTaskId } = body;
  if (!taskId || !dependsOnTaskId) {
    return NextResponse.json({ error: "taskId et dependsOnTaskId requis." }, { status: 400 });
  }
  try {
    await addDependency(taskId, dependsOnTaskId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof CycleError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
