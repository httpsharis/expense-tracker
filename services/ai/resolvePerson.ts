import type { KnownPerson } from "./types";

export type PersonResolution =
  | { status: "matched"; person: KnownPerson }
  | { status: "ambiguous"; inputName: string; candidates: KnownPerson[] }
  | { status: "unknown"; inputName: string };

const SELF_REFERENCES = new Set(["me", "you", "myself", "i"]);

export function cleanPersonName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePersonName(value: string): string {
  return cleanPersonName(value).toLowerCase();
}

export function isSelfReference(value: string): boolean {
  return SELF_REFERENCES.has(normalizePersonName(value));
}

export function dedupeNamesCaseInsensitive(
  names: readonly string[],
  options?: { excludeSelf?: boolean },
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const shouldExcludeSelf = options?.excludeSelf ?? false;

  for (const rawName of names) {
    const cleaned = cleanPersonName(rawName);
    if (!cleaned) continue;
    if (shouldExcludeSelf && isSelfReference(cleaned)) continue;

    const normalized = cleaned.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(cleaned);
  }

  return result;
}

/**
 * Matches a user-supplied name against known people case-insensitively.
 * 1. Exact case-insensitive match wins if unique.
 * 2. Prefix match (e.g. "Ali" -> "Ali Khan") wins if unique.
 * 3. Multiple matches return { status: "ambiguous", candidates }.
 * 4. Zero matches return { status: "unknown", inputName }.
 */
export function resolvePerson(
  inputName: string,
  knownPeople: readonly KnownPerson[],
): PersonResolution {
  const cleanedInput = cleanPersonName(inputName);
  const normalizedInput = cleanedInput.toLowerCase();

  if (!normalizedInput) {
    return { status: "unknown", inputName: cleanedInput };
  }

  const exactMatches = knownPeople.filter(
    (person) => normalizePersonName(person.name) === normalizedInput,
  );
  if (exactMatches.length === 1) {
    return { status: "matched", person: exactMatches[0] };
  }
  if (exactMatches.length > 1) {
    return {
      status: "ambiguous",
      inputName: cleanedInput,
      candidates: exactMatches,
    };
  }

  const prefixMatches = knownPeople.filter((person) => {
    const normalizedKnown = normalizePersonName(person.name);
    return (
      normalizedKnown.startsWith(`${normalizedInput} `) ||
      normalizedKnown.startsWith(normalizedInput)
    );
  });

  if (prefixMatches.length === 1) {
    return { status: "matched", person: prefixMatches[0] };
  }
  if (prefixMatches.length > 1) {
    return {
      status: "ambiguous",
      inputName: cleanedInput,
      candidates: prefixMatches,
    };
  }

  return { status: "unknown", inputName: cleanedInput };
}

