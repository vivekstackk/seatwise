-- Buyer hold cap (max 8 active holds per buyer) — Section 5 of the
-- master project reference.
--
-- This lived only in the live Neon database until now: it was applied
-- by hand, never committed, so a fresh clone + `drizzle-kit migrate`
-- produced a database with NO cap at all. The concurrency test's cap
-- case would fail on any new environment. This migration puts it under
-- version control.
--
-- Written idempotently (CREATE OR REPLACE / DROP IF EXISTS) because the
-- production database already has both objects — re-applying must be a
-- no-op there, not an error.
--
-- Why an advisory lock and not a plain SELECT count(*): two concurrent
-- INSERTs from the same buyer each run in their own implicit
-- transaction and would both read a stale count of 7, then both insert,
-- landing the buyer on 9 holds. pg_advisory_xact_lock(hashtext(buyer))
-- serializes same-buyer inserts only, and releases automatically when
-- the single-statement implicit transaction ends — so it needs no
-- explicit transaction, which matters because the neon-http driver has
-- no transaction support at all.

CREATE OR REPLACE FUNCTION enforce_buyer_hold_cap()
RETURNS TRIGGER AS $$
DECLARE active_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.buyer_id));

  SELECT count(*) INTO active_count
  FROM seat_holds
  WHERE buyer_id = NEW.buyer_id AND expires_at > now();

  IF active_count >= 8 THEN
    RAISE EXCEPTION 'buyer_hold_cap_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS seat_holds_enforce_cap ON seat_holds;
--> statement-breakpoint

CREATE TRIGGER seat_holds_enforce_cap
BEFORE INSERT ON seat_holds
FOR EACH ROW EXECUTE FUNCTION enforce_buyer_hold_cap();
