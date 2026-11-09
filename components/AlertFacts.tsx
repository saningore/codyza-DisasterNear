import Link from "next/link";
import { instructionText, severityLabel } from "@/lib/alerts";
import { NOT_INCLUDED, relationNote } from "@/lib/copy";
import { formatOfficialTime, isBefore } from "@/lib/time";
import type { OfficialAlert } from "@/lib/types";

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
      <dt className="font-bold">{term}</dt>
      <dd className="min-w-0 whitespace-pre-wrap">{children}</dd>
    </div>
  );
}

function when(iso: string | null, timeZone: string | null, field: string): string | null {
  const formatted = formatOfficialTime(iso, timeZone);
  return formatted ? `${field}: ${formatted}` : null;
}

export default function AlertFacts({
  alert,
  timeZone,
  retrievedAt,
  latitude,
  longitude,
  showPageLink = true,
}: {
  alert: OfficialAlert;
  timeZone: string | null;
  retrievedAt: string;
  latitude?: number;
  longitude?: number;
  showPageLink?: boolean;
}) {
  const start = [when(alert.onset, timeZone, "Onset"), when(alert.effective, timeZone, "Effective")]
    .filter((line, index, all) => line && all.indexOf(line) === index);
  const end = [when(alert.expires, timeZone, "Expires"), when(alert.ends, timeZone, "Ends")]
    .filter((line): line is string => Boolean(line));
  const expired = isBefore(alert.expires, retrievedAt);
  const readable = showPageLink && alert.id
    ? `/alerts/${encodeURIComponent(alert.id)}${latitude !== undefined && longitude !== undefined ? `?lat=${latitude}&lon=${longitude}` : ""}`
    : null;

  return (
    <dl className="mt-4 space-y-3 text-sm">
      <Fact term="Alert type">{alert.event ?? NOT_INCLUDED}</Fact>
      <Fact term="Severity">{severityLabel(alert.severity)}</Fact>
      <Fact term="Urgency">{alert.urgency ?? NOT_INCLUDED}</Fact>
      <Fact term="Certainty">{alert.certainty ?? NOT_INCLUDED}</Fact>
      <Fact term="Area affected">{alert.areaDesc ?? NOT_INCLUDED}</Fact>
      <Fact term="Map relationship">{relationNote(alert.relation, alert.relationChecked)}</Fact>
      <Fact term="Start time">{start.length ? start.join("\n") : NOT_INCLUDED}</Fact>
      <Fact term="Expiration / end">
        {end.length ? end.join("\n") : NOT_INCLUDED}
        {expired ? "\nThe expiration time in this alert is earlier than this page's retrieval time. NWS still included it in the active feed." : ""}
      </Fact>
      <Fact term="Official instructions">{instructionText(alert.instruction)}</Fact>
      <Fact term="Issuing authority">{alert.senderName ?? NOT_INCLUDED}</Fact>
      <Fact term="NWS status">{alert.status ?? NOT_INCLUDED}</Fact>
      <Fact term="NWS message type">{alert.messageType ?? NOT_INCLUDED}</Fact>
      {alert.response ? <Fact term="NWS response field">{alert.response}</Fact> : null}
      {alert.headline ? <Fact term="Headline">{alert.headline}</Fact> : null}
      {alert.description ? <Fact term="Official description">{alert.description}</Fact> : null}
      <Fact term="Original source">
        {alert.officialUrl ? (
          <a className="font-bold text-sea underline underline-offset-2" href={alert.officialUrl} target="_blank" rel="noopener noreferrer">Open the NWS alert record</a>
        ) : "An official link was not included by NWS."}
        {alert.web && alert.web !== alert.officialUrl ? (
          <>
            {"\n"}
            <a className="font-bold text-sea underline underline-offset-2" href={alert.web} target="_blank" rel="noopener noreferrer">Web address included in the alert</a>
          </>
        ) : null}
        {readable ? (
          <>
            {"\n"}
            <Link className="font-bold text-sea underline underline-offset-2" href={readable}>Readable copy of this NWS record</Link>
          </>
        ) : null}
      </Fact>
    </dl>
  );
}
