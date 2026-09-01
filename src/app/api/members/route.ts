import { NextResponse } from "next/server";
import { createMember } from "@/server/actions";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
  }
  const member = await createMember(body.name);
  return NextResponse.json(member, { status: 201 });
}
