export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    engine: "nspace-liquid",
    time: new Date().toISOString(),
    realTime: true,
  });
}
