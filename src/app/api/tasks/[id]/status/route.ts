import { NextResponse } from "next/server";
import { setTaskStatus } from "@/server/actions";
import type { TaskStatus } from "@/domain/types";

const VALID: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (!VALID.includes(body.status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }
    const result = await setTaskStatus(params.id, body.status);
    return NextResponse.json(result);
  } catch (err) {
    console.error(`POST /api/tasks/${params.id}/status failed:`, err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
