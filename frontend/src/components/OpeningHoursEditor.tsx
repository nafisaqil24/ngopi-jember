import {
  DAY_DISPLAY_ORDER,
  formatDayName,
  isOvernightRange,
} from "../utils/openingHours";
import type { OpeningHourEntry } from "../types/coffeeShop";

interface OpeningHoursEditorProps {
  value: OpeningHourEntry[];
  onChange: (entries: OpeningHourEntry[]) => void;
  disabled?: boolean;
}

const DEFAULT_OPEN = "10:00";
const DEFAULT_CLOSE = "22:00";

function orderedEntries(value: OpeningHourEntry[]): OpeningHourEntry[] {
  const byDay = new Map(value.map((entry) => [entry.dayOfWeek, entry]));
  return DAY_DISPLAY_ORDER.map(
    (dayOfWeek) =>
      byDay.get(dayOfWeek) ?? {
        dayOfWeek,
        open: DEFAULT_OPEN,
        close: DEFAULT_CLOSE,
        isClosed: false,
      }
  );
}

export default function OpeningHoursEditor({
  value,
  onChange,
  disabled = false,
}: OpeningHoursEditorProps) {
  const entries = orderedEntries(value);
  const monday = entries[0];

  function updateDay(dayOfWeek: number, patch: Partial<OpeningHourEntry>) {
    onChange(
      entries.map((entry) =>
        entry.dayOfWeek === dayOfWeek ? { ...entry, ...patch } : entry
      )
    );
  }

  function copyMondayToAll() {
    onChange(
      entries.map((entry) => ({
        dayOfWeek: entry.dayOfWeek,
        open: monday.open,
        close: monday.close,
        isClosed: monday.isClosed,
      }))
    );
  }

  return (
    <div className="rounded-xl border border-espresso/15 bg-cream/30 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-espresso">Jam operasional per hari</p>
          <p className="text-xs text-espresso/50">
            Centang Libur jika kedai tutup pada hari tersebut.
          </p>
        </div>
        <button
          type="button"
          onClick={copyMondayToAll}
          disabled={disabled}
          className="rounded-lg border border-espresso/15 px-3 py-1.5 text-xs font-bold text-espresso hover:bg-espresso/5 disabled:opacity-50"
        >
          Salin Senin ke semua hari
        </button>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => {
          const missingTime = !entry.isClosed && (!entry.open || !entry.close);
          const overnight =
            !entry.isClosed && !missingTime && isOvernightRange(entry.open, entry.close);

          return (
            <div
              key={entry.dayOfWeek}
              className="grid grid-cols-[76px_auto_1fr_auto] items-center gap-2 rounded-lg bg-white px-3 py-2"
            >
              <span className="text-sm font-bold text-espresso">
                {formatDayName(entry.dayOfWeek)}
              </span>

              <label className="flex items-center gap-1.5 text-xs font-semibold text-espresso/70">
                <input
                  type="checkbox"
                  checked={entry.isClosed}
                  disabled={disabled}
                  onChange={(event) =>
                    updateDay(entry.dayOfWeek, {
                      isClosed: event.target.checked,
                      ...(event.target.checked
                        ? {
                            open: entry.open || "00:00",
                            close: entry.close || "00:00",
                          }
                        : {}),
                    })
                  }
                  className="rounded border-espresso/15 bg-white p-1"
                />
                Libur
              </label>

              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={entry.open}
                  disabled={disabled || entry.isClosed}
                  onChange={(event) =>
                    updateDay(entry.dayOfWeek, { open: event.target.value })
                  }
                  className="w-full min-w-0 rounded-lg border border-espresso/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-terracotta disabled:bg-espresso/5 disabled:text-espresso/40"
                  aria-label={`Jam buka ${formatDayName(entry.dayOfWeek)}`}
                />
                <span className="text-xs font-bold text-espresso/40">–</span>
                <input
                  type="time"
                  value={entry.close}
                  disabled={disabled || entry.isClosed}
                  onChange={(event) =>
                    updateDay(entry.dayOfWeek, { close: event.target.value })
                  }
                  className="w-full min-w-0 rounded-lg border border-espresso/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-terracotta disabled:bg-espresso/5 disabled:text-espresso/40"
                  aria-label={`Jam tutup ${formatDayName(entry.dayOfWeek)}`}
                />
              </div>

              <span className="min-w-[92px] text-right text-[11px] font-semibold">
                {entry.isClosed ? (
                  <span className="text-espresso/40">Tutup</span>
                ) : missingTime ? (
                  <span className="text-danger">Wajib diisi</span>
                ) : overnight ? (
                  <span className="text-terracotta-strong">Tutup besok dini hari</span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}