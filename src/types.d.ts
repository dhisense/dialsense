export declare enum ParseErrorCode {
    INVALID_COUNTRY_CODE = "INVALID_COUNTRY_CODE",
    TOO_SHORT = "TOO_SHORT",
    TOO_LONG = "TOO_LONG",
    NOT_A_NUMBER = "NOT_A_NUMBER"
}
export interface PhoneNumber {
    e164: string;
    countryCode: number;
    nationalNumber: string;
    type: 'MOBILE' | 'FIXED' | 'VOIP' | 'UNKNOWN';
}
export type ParseResult = {
    success: true;
    data: PhoneNumber;
} | {
    success: false;
    error: ParseErrorCode;
    message: string;
};
//# sourceMappingURL=types.d.ts.map