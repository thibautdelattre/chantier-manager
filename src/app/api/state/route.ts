import { NextResponse } from "next/server";
import { getState } from "@/server/actions";

// Cette route doit toujours lire les données fraîches : sans ceci, Next.js
// la traite comme statique et sert une réponse mise en cache indéfiniment,
// ce qui donnait l'impression que les actions (créer, terminer, rouvrir...)
// ne faisaient rien alors qu'elles réussissaient bien côté serveur.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const state = await getState();
    return NextResponse.json(state, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("GET /api/state failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
