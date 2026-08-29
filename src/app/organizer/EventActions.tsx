"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent, setEventStatus } from "@/lib/db/organizer";

/**
 * Publish / unpublish / delete for one row of the dashboard.
 *
 * Delete is guarded twice: the browser asks for confirmation, and the
 * server refuses outright once any ticket exists for the event (the
 * cascade would take a buyer's paid ticket with it). Unpublishing is
 * the reversible alternative and is what the copy steers toward.
 */
export default function EventActions({
  id,
  status,
  sold,
}: {
  id: string;
  status: string;
  sold: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);

    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          setError(result.error ?? "That didn't work.");
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "That didn't work.");
      }
    });
  };

  return (
    <div className="organizer-row__actions">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(() =>
            setEventStatus(id, status === "published" ? "draft" : "published")
          )
        }
      >
        {status === "published" ? "UNPUBLISH" : "PUBLISH"}
      </button>

      <button
        type="button"
        className="organizer-row__delete"
        disabled={pending || sold > 0}
        title={
          sold > 0
            ? "Tickets have been sold — unpublish instead."
            : "Delete this event"
        }
        onClick={() => {
          if (
            !window.confirm(
              "Delete this event permanently? This can't be undone."
            )
          ) {
            return;
          }
          run(() => deleteEvent(id));
        }}
      >
        DELETE
      </button>

      {error && <span className="organizer-row__error">{error}</span>}
    </div>
  );
}
