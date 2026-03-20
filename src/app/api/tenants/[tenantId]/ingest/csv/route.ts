import { ingestLeadCsv } from "@/lib/csv/ingestLeadCsv";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await context.params;
    const formData = await req.formData();
    const file = formData.get("file") as unknown;
    const fileLike = file as { arrayBuffer?: () => Promise<ArrayBuffer>; name?: string; size?: number } | null;
    if (!fileLike || typeof fileLike.arrayBuffer !== "function") {
      return Response.json({ error: "Missing `file` in multipart form-data." }, { status: 400 });
    }

    // Keep the MVP safe for server memory.
    const maxBytes = 10 * 1024 * 1024;
    if (typeof fileLike.size === "number" && fileLike.size > maxBytes) {
      return Response.json(
        { error: `File too large. Max is ${maxBytes / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    const buf = await fileLike.arrayBuffer();
    const csvText = new TextDecoder("utf-8").decode(buf);

    const result = await ingestLeadCsv({
      tenantId,
      csvText,
      fileName: fileLike.name,
    });

    return Response.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

