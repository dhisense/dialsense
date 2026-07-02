import type { PhoneNumber } from './types.js';

// Live-lookup counterpart to metadata.ts's static country data: this is
// the plugin point for real-time telephony intelligence (HLR-style
// reachability, carrier/porting/roaming status, CNAM, fraud/risk scoring)
// that static regex patterns fundamentally can't provide - e.g. `parse()`
// can never resolve `PhoneNumber.type` past 'UNKNOWN' for countries where
// mobile and fixed-line share the same numbering pattern, but a live
// lookup can. DialSense ships the interface, not an implementation -
// consumers plug in their own provider.
export interface ReachabilityResult {
  reachable: boolean | null;
  lineType: 'MOBILE' | 'FIXED' | 'VOIP' | 'UNKNOWN';
  carrierName: string | null;
  ported: boolean | null;
  roaming: boolean | null;
  callerName: string | null;
  riskScore: number | null;
}

export interface IReachabilityProvider {
  lookup(phoneNumber: PhoneNumber): Promise<ReachabilityResult>;
}

let _provider: IReachabilityProvider | null = null;

export const configure = (config: { provider: IReachabilityProvider | null }) => {
  _provider = config.provider;
};

export const getProvider = (): IReachabilityProvider | null => _provider;
