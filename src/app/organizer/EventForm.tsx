"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEvent, updateEvent, type EventInput } from "@/lib/db/organizer";
import { EVENT_CATEGORIES } from "@/lib/eventCategories";

type Props = {
  mode: "create" | "edit";
  eventId?: string;
  initial: EventInput;
  /** Sold seats — the grid inputs are floored to the current size once
   *  anything is sold, matching the server-side rule. */
  sold?: number;
  minRows?: number;
  minSeatsPerRow?: number;
};

const IMAGE_CHOICES = Array.from(
  { length: 9 },
  (_, i) => `/events/img-${i + 1}.png`
);

export default function EventForm({
  mode,
  eventId,
  initial,
  sold = 0,
  minRows = 1,
  minSeatsPerRow = 1,
}: Props) {
  const router = useRouter();

  const [form, setForm] = useState<EventInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof EventInput>(key: K, value: EventInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const result =
        mode === "create"
          ? await createEvent(form)
          : await updateEvent(eventId!, form);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push("/organizer");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const capacity = form.seatRows * form.seatsPerRow;
  return (
    <form className="organizer-form" onSubmit={submit}>
      <div className="organizer-form__row">
        <label className="organizer-field organizer-field--wide">
          <span>TITLE</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={120}
            required
          />
        </label>

        <label className="organizer-field">
          <span>CATEGORY</span>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {EVENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="organizer-form__row">
        <label className="organizer-field">
          <span>STARTS (IST)</span>
          <input
            type="datetime-local"
            value={form.startsAtLocal}
            onChange={(e) => set("startsAtLocal", e.target.value)}
            required
          />
          <small>Entered and stored as Asia/Kolkata.</small>
        </label>

        <label className="organizer-field">
          <span>PRICE (₹ PER SEAT)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={form.priceRupees}
            onChange={(e) => set("priceRupees", Number(e.target.value))}
            required
          />
        </label>
      </div>
      <div className="organizer-form__row">
        <label className="organizer-field">
          <span>CITY</span>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            maxLength={60}
            required
          />
        </label>

        <label className="organizer-field">
          <span>VENUE</span>
          <input
            type="text"
            value={form.venue}
            onChange={(e) => set("venue", e.target.value)}
            maxLength={80}
            required
          />
        </label>
      </div>

      <div className="organizer-form__row">
        <label className="organizer-field">
          <span>ROWS</span>
          <input
            type="number"
            min={minRows}
            max={26}
            step={1}
            value={form.seatRows}
            onChange={(e) => set("seatRows", Number(e.target.value))}
            required
          />
        </label>

        <label className="organizer-field">
          <span>SEATS PER ROW</span>
          <input
            type="number"
            min={minSeatsPerRow}
            max={20}
            step={1}
            value={form.seatsPerRow}
            onChange={(e) => set("seatsPerRow", Number(e.target.value))}
            required
          />
        </label>

        <div className="organizer-field organizer-field--readout">
          <span>CAPACITY</span>
          <strong>{capacity}</strong>
          {sold > 0 && <small>{sold} sold — grid can only grow.</small>}
        </div>
      </div>
      <label className="organizer-field organizer-field--wide">
        <span>DESCRIPTION</span>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          maxLength={1200}
        />
      </label>

      <fieldset className="organizer-field organizer-field--wide">
        <legend>ARTWORK</legend>

        <div className="organizer-form__images">
          {IMAGE_CHOICES.map((image) => (
            <label
              key={image}
              className={
                form.image === image
                  ? "organizer-image organizer-image--active"
                  : "organizer-image"
              }
            >
              <input
                type="radio"
                name="image"
                value={image}
                checked={form.image === image}
                onChange={() => set("image", image)}
              />
              <img src={image} alt="" />
            </label>
          ))}
        </div>

        <small>
          Uses the artwork already bundled with the site — there is no
          upload pipeline yet.
        </small>
      </fieldset>

      <label className="organizer-field organizer-field--wide">
        <span>STATUS</span>
        <select
          value={form.status}
          onChange={(e) =>
            set("status", e.target.value as EventInput["status"])
          }
        >
          <option value="draft">DRAFT — hidden from buyers</option>
          <option value="published">PUBLISHED — bookable</option>
        </select>
      </label>
      {error && (
        <p className="organizer-form__error" role="alert">
          {error}
        </p>
      )}

      <div className="organizer-form__actions">
        <button type="submit" disabled={saving}>
          {saving
            ? "SAVING…"
            : mode === "create"
              ? "CREATE EVENT ↗"
              : "SAVE CHANGES ↗"}
        </button>

        <Link href="/organizer">CANCEL</Link>
      </div>
    </form>
  );
}
