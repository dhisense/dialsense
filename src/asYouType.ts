import { getMetadata, type FormatRule } from './metadata.js';

const SANITIZE_PATTERN = /[^\d]/g;

// Long enough that any real leadingDigits pattern can complete a full
// match attempt against typed digits, however few there are.
const PREFIX_TEST_PADDING = '0'.repeat(20);

// Tests whether `typed` (a prefix of an eventual number) is consistent
// with `leadingDigitsPattern` - not the same as a normal regex test,
// since `typed` may be too short for the pattern to match on its own yet.
// Padding lets the pattern attempt a full match; because the regex is
// anchored at the start and the padded string's first `typed.length`
// characters are exactly what was typed, any successful match proves the
// real typed digits are consistent with the pattern - whether it matched
// entirely within them already, or needed padding to finish. A failed
// match means the real digits already contradict the pattern.
const isPrefixCompatible = (typed: string, leadingDigitsPattern: string): boolean =>
  new RegExp(`^(?:${leadingDigitsPattern})`).test(typed + PREFIX_TEST_PADDING);

// Parses "(\d{3})(\d{4})" into fixed group lengths [3, 4]. Returns
// undefined for patterns that don't decompose into simple fixed-length
// digit groups - rather than guess, those rules just aren't used for
// live formatting (falls back to plain digits if nothing else matches).
const parseGroupLengths = (pattern: string): number[] | undefined => {
  const groups = [...pattern.matchAll(/\(\\d\{(\d+)\}\)/g)];
  return groups.length > 0 ? groups.map((g) => Number(g[1])) : undefined;
};

// Among rules consistent with the digits typed so far, prefers the one
// with the LARGEST total capacity - not simply the first declared. e.g.
// US has both a 7-digit local-only rule and the standard 10-digit rule;
// a number starting with digits compatible with both should format
// progressively as the 10-digit one (confirmed against a documented real
// example: formatting "2133734" produces "(213) 373-4", the partial
// 10-digit grouping, not the 7-digit dash format) - only falling back to
// a shorter/more specific rule once it's the only one still compatible
// (e.g. once more than 7 digits have been typed).
const findCandidateRule = (typedDigits: string, rules: FormatRule[]): FormatRule | undefined => {
  let best: { rule: FormatRule; capacity: number } | undefined;

  for (const rule of rules) {
    const groupLengths = parseGroupLengths(rule.pattern);
    if (!groupLengths) {
      continue;
    }

    // Reject rules that can't hold what's already been typed -
    // leadingDigits compatibility alone isn't enough, since a short
    // leadingDigits pattern (e.g. "310") can be satisfied well before the
    // digit count exceeds that rule's total capacity.
    const capacity = groupLengths.reduce((sum, n) => sum + n, 0);
    if (typedDigits.length > capacity) {
      continue;
    }

    // A rule with no leadingDigits at all is always compatible (some
    // rules don't have any). Otherwise, only the *last* entry is tested -
    // upstream documents each as a stricter refinement of the one
    // before it, not an independent alternative.
    const leadingDigits = rule.leadingDigits;
    const compatible =
      !leadingDigits || leadingDigits.length === 0 || isPrefixCompatible(typedDigits, leadingDigits.at(-1) ?? '');
    if (!compatible) {
      continue;
    }

    if (!best || capacity > best.capacity) {
      best = { rule, capacity };
    }
  }

  return best?.rule;
};

// Splits a format template like "($1) $2-$3" into the literal text
// around each placeholder: ["(", ") ", "-"] - index 0 is whatever
// precedes $1, each following entry is what comes between that group and
// the next.
const parseSeparators = (format: string): string[] => format.split(/\$\d/);

const buildLiveFormat = (typedDigits: string, rule: FormatRule, nationalPrefix: string | undefined): string => {
  const groupLengths = parseGroupLengths(rule.pattern) ?? [];
  const separators = parseSeparators(rule.format);

  let result = separators[0] ?? '';
  let remaining = typedDigits;

  for (let i = 0; i < groupLengths.length && remaining.length > 0; i++) {
    let chunk = remaining.slice(0, groupLengths[i]);
    remaining = remaining.slice(groupLengths[i]);

    if (i === 0 && rule.nationalPrefixFormattingRule) {
      chunk = rule.nationalPrefixFormattingRule.replace('$NP', nationalPrefix ?? '').replace('$FG', chunk);
    }

    result += chunk;
    if (remaining.length > 0) {
      result += separators[i + 1] ?? '';
    }
  }

  return result;
};

// A pure function, not a stateful class: called fresh with the full
// accumulated input each time (like a controlled input's current value),
// not incrementally fed one digit at a time with hidden state to manage.
// Deletion needs no special handling as a result - calling this with a
// shorter string just recomputes correctly, since there's nothing to
// reset.
export const asYouType = (inputSoFar: string, region: string): string => {
  const typedDigits = inputSoFar.replace(SANITIZE_PATTERN, '');
  const metadata = getMetadata()[region];
  const rules = metadata?.formats ?? [];

  const rule = findCandidateRule(typedDigits, rules);
  if (!rule) {
    return typedDigits;
  }

  return buildLiveFormat(typedDigits, rule, metadata?.nationalPrefix);
};
