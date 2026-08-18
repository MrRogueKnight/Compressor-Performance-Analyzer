/**
 * General Utility Functions
 */
export const Utils = {
    clamp: function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    safeLog: function(value) {
        return value <= 0 ? -Infinity : Math.log(value);
    },
    safePow: function(base, exponent) {
        if (base <= 0 || exponent > 10) return 0;
        return Math.pow(base, exponent);
    },
    format: function(value, decimals) {
        decimals = decimals || 2;
        if (!isFinite(value)) return '∞';
        if (value === null || value === undefined) return '-';
        return Number(value).toFixed(decimals);
    },
    random: function(min, max) {
        return Math.random() * (max - min) + min;
    },
    isValid: function(value) {
        return value !== null && value !== undefined && isFinite(value);
    }
};