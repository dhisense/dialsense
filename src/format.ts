import { getMetadata, type CountryMetadata, type FormatRule } from './metadata.js';
import type { PhoneNumber } from './types.js';

export type FormatStyle = 'NATIONAL' | 'INTERNATIONAL' | 'E164';

const applyTemplate = (template: string, groups: string[]): string =>
  template.replace(/\$(\d)/g, (_match, index: string) => groups[Number(index) - 1] ?? '');

interface RuleMatch {
  rule: FormatRule;
  groups: string[];
}

// `skipNA` is only relevant for INTERNATIONAL - a rule's `intlFormat` of
// exactly "NA" means "don't use this rule internationally, try the next
// matching one" (e.g. a local-only format that omits the area code).
const findMatchingRule = (nationalNumber: string, rules: FormatRule[], skipNA: boolean): RuleMatch | undefined => {
  for (const rule of rules) {
    if (skipNA && rule.intlFormat === 'NA') {
      continue;
    }
    const match = nationalNumber.match(new RegExp(`^(?:${rule.pattern})$`));
    if (match) {
      return { rule, groups: match.slice(1) };
    }
  }
  return undefined;
};

const formatNational = (nationalNumber: string, region: CountryMetadata): string => {
  const found = findMatchingRule(nationalNumber, region.formats ?? [], false);
  if (!found) {
    return nationalNumber;
  }
  const { rule, groups } = found;

  if (!rule.nationalPrefixFormattingRule) {
    return applyTemplate(rule.format, groups);
  }

  // Only the first group gets prefix-wrapped - e.g. rule "$NP$FG" with
  // nationalPrefix "0" and first group "10" produces "010", which then
  // substitutes wherever `format` uses "$1".
  const prefixedFirstGroup = rule.nationalPrefixFormattingRule
    .replace('$NP', region.nationalPrefix ?? '')
    .replace('$FG', groups[0] ?? '');
  return applyTemplate(rule.format, [prefixedFirstGroup, ...groups.slice(1)]);
};

const formatInternational = (nationalNumber: string, region: CountryMetadata): string => {
  const found = findMatchingRule(nationalNumber, region.formats ?? [], true);
  const grouped = found ? applyTemplate(found.rule.intlFormat ?? found.rule.format, found.groups) : nationalNumber;
  return `+${region.callingCode} ${grouped}`;
};

// Falls back to the unformatted national number (NATIONAL) or plain
// e164 (INTERNATIONAL/E164 with no region resolved) rather than
// throwing - consistent with the rest of this library treating missing
// metadata as "can't do better," not an error.
export const format = (phoneNumber: PhoneNumber, style: FormatStyle): string => {
  if (style === 'E164') {
    return phoneNumber.e164;
  }

  const region = phoneNumber.region ? getMetadata()[phoneNumber.region] : undefined;
  if (!region) {
    return phoneNumber.e164;
  }

  if (style === 'NATIONAL') {
    return formatNational(phoneNumber.nationalNumber, region);
  }

  return formatInternational(phoneNumber.nationalNumber, region);
};
