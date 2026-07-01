import { ParseErrorCode } from './types.js';
// This function will eventually hook into your modular metadata
export const parse = (input, defaultCountry) => {
    // TODO: Add implementation logic here
    // 1. Sanitize input
    // 2. Load metadata (or use provided injection)
    // 3. Return { success: true, data: ... } or { success: false, ... }
    return {
        success: false,
        error: ParseErrorCode.NOT_A_NUMBER,
        message: 'Not implemented',
    };
};
export const isValid = (input, country) => {
    return parse(input, country).success;
};
//# sourceMappingURL=core.js.map