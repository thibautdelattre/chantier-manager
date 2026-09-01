import { NextResponse } from "next/server";
import { renameMember } from "@/server/actions";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const member = await renameMember(params.id, body.name);
  return NextResponse.json(member);
}
