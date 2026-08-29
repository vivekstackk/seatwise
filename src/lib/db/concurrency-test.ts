import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("./index");
  const { events, user } = await import("./schema");
  const { holdSeatsCore, releaseSeatCore, getHeldOrSoldSeats } = await import(
    "./holds"
  );
  const { sql } = await import("drizzle-orm");

  const TEST_EVENT_ID = "concurrency-test-event";
  const NUM_BUYERS = 20;

  console.log("Setting up test fixtures...\n");

  // Throwaway event — seat_holds.event_id has a real FK, so this
  // has to exist even though it's not a real event anyone sees.
  await db
    .insert(events)
    .values({
      id: TEST_EVENT_ID,
      number: "00",
      title: "Concurrency Test Event",
      category: "Test",
      startsAt: new Date(),
      location: "Test",
      venue: "Test",
      priceCents: 0,
      status: "draft",
    })
    .onConflictDoUpdate({
      target: events.id,
      set: { title: "Concurrency Test Event" },
    });

  // Throwaway buyers — seat_holds.buyer_id also has a real FK to
  // the actual user table.
  const buyerIds = Array.from({ length: NUM_BUYERS }, (_, i) => `test-buyer-${i}`);

  for (const buyerId of buyerIds) {
    await db
      .insert(user)
      .values({
        id: buyerId,
        name: `Test Buyer ${buyerId}`,
        email: `${buyerId}@concurrency-test.local`,
      })
      .onConflictDoNothing();
  }

  console.log(`Created test event + ${NUM_BUYERS} test buyers.\n`);
  console.log("=== Same-seat concurrency test ===\n");

  let allPassed = true;

  for (let run = 1; run <= 10; run++) {
    // Clear any holds left from the previous run.
    await db.execute(sql`DELETE FROM seat_holds WHERE event_id = ${TEST_EVENT_ID}`);

    const results = await Promise.all(
      buyerIds.map((buyerId) =>
        holdSeatsCore(TEST_EVENT_ID, ["Z1"], buyerId)
      )
    );

    const heldCount = results.filter((r) => r.held.includes("Z1")).length;
    const conflictCount = results.filter((r) => r.conflicts.includes("Z1")).length;
    const pass = heldCount === 1 && conflictCount === NUM_BUYERS - 1;

    if (!pass) allPassed = false;

    console.log(
      `Run ${run}: ${NUM_BUYERS} parallel requests -> ${heldCount} held, ${conflictCount} conflicts [${pass ? "PASS" : "FAIL"}]`
    );
  }

  console.log("\n=== Buyer hold cap test ===\n");

  await db.execute(sql`DELETE FROM seat_holds WHERE event_id = ${TEST_EVENT_ID}`);

  const capResults = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      holdSeatsCore(TEST_EVENT_ID, [`Z${i + 2}`], "test-buyer-0")
    )
  );

  const heldCount = capResults.filter((r) => r.held.length > 0).length;
  const capExceededCount = capResults.filter((r) => r.capExceeded).length;
  const capPass = heldCount === 8 && capExceededCount === 2;

  if (!capPass) allPassed = false;

  console.log(
    `10 parallel requests from same buyer -> ${heldCount} held, ${capExceededCount} cap_exceeded [${capPass ? "PASS" : "FAIL"}]`
  );

  console.log("\n=== Hold release test ===\n");

  await db.execute(sql`DELETE FROM seat_holds WHERE event_id = ${TEST_EVENT_ID}`);
  await db.execute(sql`DELETE FROM hold_history WHERE event_id = ${TEST_EVENT_ID}`);

  const owner = "test-buyer-1";
  const other = "test-buyer-2";

  const first = await holdSeatsCore(TEST_EVENT_ID, ["Z1"], owner);

  // A release names a buyer, so someone else asking for the same seat to
  // be freed must not be able to knock a hold out from under its owner.
  await releaseSeatCore(TEST_EVENT_ID, "Z1", other);
  const stillHeld = (await getHeldOrSoldSeats(TEST_EVENT_ID)).includes("Z1");

  await releaseSeatCore(TEST_EVENT_ID, "Z1", owner);
  const afterRelease = (await getHeldOrSoldSeats(TEST_EVENT_ID)).includes("Z1");

  const rehold = await holdSeatsCore(TEST_EVENT_ID, ["Z1"], other);

  const historyResult = await db.execute(sql`
    SELECT released_at FROM hold_history
    WHERE event_id = ${TEST_EVENT_ID} AND seat_id = 'Z1' AND buyer_id = ${owner}
  `);
  const historyRows = (
    Array.isArray(historyResult) ? historyResult : (historyResult?.rows ?? [])
  ) as { released_at: unknown }[];
  const auditClosed = historyRows.every((r) => r.released_at !== null);

  const releasePass =
    first.held.includes("Z1") &&
    stillHeld &&
    !afterRelease &&
    rehold.held.includes("Z1") &&
    historyRows.length > 0 &&
    auditClosed;

  if (!releasePass) allPassed = false;

  console.log(
    `release by non-owner ignored: ${stillHeld ? "yes" : "no"} / seat freed by owner: ${!afterRelease ? "yes" : "no"} / re-held by another buyer: ${rehold.held.includes("Z1") ? "yes" : "no"} / hold_history closed: ${auditClosed ? "yes" : "no"} [${releasePass ? "PASS" : "FAIL"}]`
  );

  console.log("\nCleaning up test fixtures...");

  await db.execute(sql`DELETE FROM seat_holds WHERE event_id = ${TEST_EVENT_ID}`);
  await db.execute(sql`DELETE FROM hold_history WHERE event_id = ${TEST_EVENT_ID}`);
  await db.execute(sql`DELETE FROM events WHERE id = ${TEST_EVENT_ID}`);
  for (const buyerId of buyerIds) {
    await db.execute(sql`DELETE FROM "user" WHERE id = ${buyerId}`);
  }

  console.log(`\n${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Test crashed:", err);
  process.exit(1);
});