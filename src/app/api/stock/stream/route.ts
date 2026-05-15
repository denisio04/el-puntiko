import { NextRequest } from "next/server";
import { stockEventBus } from "@/lib/stockEvents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = stockEventBus.subscribe((productId, availableStock) => {
        if (closed) return;
        try {
          controller.enqueue(
            `data: ${JSON.stringify({ productId, availableStock })}\n\n`
          );
        } catch {
          closed = true;
          unsubscribe();
        }
      });

      request.signal.addEventListener("abort", () => {
        closed = true;
        unsubscribe();
        try { controller.close(); } catch {}
      });

      request.signal.addEventListener("close", () => {
        closed = true;
        unsubscribe();
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
