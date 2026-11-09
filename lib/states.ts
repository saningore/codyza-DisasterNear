const US_STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO",
  connecticut: "CT", delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY",
  louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA",
  washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY", "puerto rico": "PR",
  guam: "GU", "american samoa": "AS", "u.s. virgin islands": "VI", "virgin islands": "VI",
  "northern mariana islands": "MP",
};

export const US_ABBREVIATIONS = new Set(Object.values(US_STATE_NAMES));

export function stateAbbreviation(value: string): string | null {
  const token = value.trim().toLowerCase().replace(/\./g, "");
  if (/^[a-z]{2}$/.test(token)) {
    const upper = token.toUpperCase();
    return US_ABBREVIATIONS.has(upper) ? upper : null;
  }
  return US_STATE_NAMES[token] ?? null;
}

export function zipFive(value: string | null | undefined): string | null {
  const match = (value ?? "").trim().match(/^(\d{5})(?:-?\d{4})?$/);
  return match ? match[1] : null;
}
