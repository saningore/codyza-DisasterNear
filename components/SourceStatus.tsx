import { formatOfficialTime } from "@/lib/time";
import type { SourceReport } from "@/lib/types";

const STATUS_WORD = {
  ok: "Response received",
  empty: "No matching records",
  error: "Could not be checked",
} as const;

export default function SourceStatus({ sources, retrievedAt, timeZone }: {
  sources: SourceReport[];
  retrievedAt: string;
  timeZone: string | null;
}) {
  return (
    <section aria-labelledby="sources-heading" className="rounded-3xl border border-line bg-card p-4">
      <h2 id="sources-heading" className="font-serif text-2xl font-semibold">Sources checked</h2>
      <p className="mt-1 text-sm">Checked at {formatOfficialTime(retrievedAt, timeZone) ?? retrievedAt}.</p>
      <ul className="mt-3 space-y-3">
        {sources.map((source) => (
          <li key={source.id} data-source={source.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
            <p className="font-bold">{source.name}</p>
            <p>{STATUS_WORD[source.status]}</p>
            <p className="text-sm text-ink/80">{source.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
