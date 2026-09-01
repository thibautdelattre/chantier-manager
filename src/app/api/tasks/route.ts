import { NextResponse } from "next/server";
import { createTask } from "@/server/actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "Le titre est obligatoire." }, { status: 400 });
    }
    const task = await createTask(body);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("POST /api/tasks failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
