import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { orders, tickets, seatHolds } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID, createHmac } from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as any;
  const { eventId, buyerId, seatIds, idempotencyKey } = session.metadata;
  const seatIdList: string[] = seatIds.split(",");

  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, idempotencyKey));

  if (!existingOrder || existingOrder.status === "paid") {
    return NextResponse.json({ received: true });
  }

  await db.update(orders).set({ status: "paid" }).where(eq(orders.id, existingOrder.id));

  for (const seatId of seatIdList) {
    const qrPayload = `${eventId}:${seatId}:${existingOrder.id}`;
    const qrToken = createHmac("sha256", process.env.TICKET_SIGNING_SECRET!)
      .update(qrPayload)
      .digest("hex");

    await db.insert(tickets).values({
      id: randomUUID(),
      orderId: existingOrder.id,
      eventId,
      seatId,
      qrToken,
      status: "valid",
    });
  }

  await db.delete(seatHolds).where(eq(seatHolds.eventId, eventId));

  return NextResponse.json({ received: true });
}