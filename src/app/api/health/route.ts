/**
 * Liveness für Docker/Coolify — keine DB, kein env-Import (startet auch wenn App noch lädt).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { status: "ok", service: "kraeuterfee-dashboard", ts: Date.now() },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
