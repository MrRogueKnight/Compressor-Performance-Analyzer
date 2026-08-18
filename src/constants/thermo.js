/**
 * Thermodynamic Constants
 * Reference: ASME PTC 10 - Centrifugal Compressors
 */
export const THERMO = {
    PSYCHROMETRIC: {
        TETENS_A: 17.27,
        TETENS_B: 237.3,
        SATURATION_COEFF: 0.61078,
        HUMIDITY_RATIO_COEFF: 0.62198
    },
    GAS: {
        R_AIR: 0.287,
        R_WATER: 0.4615,
        CP_AIR: 1.005,
        CV_AIR: 0.718,
        GAMMA: 1.4,
        Z_AIR: 0.999,
        MW_AIR: 28.97,
        MW_WATER: 18.015
    },
    STANDARD: {
        PRESSURE: 101.325,
        TEMPERATURE: 288.15
    },
    COMPRESSOR: {
        CLEARANCE_FACTOR: 0.05,
        EFFICIENCY_MIN: 65,
        EFFICIENCY_MAX: 92,
        MAX_STAGES: 20
    },
    UNITS: {
        BAR_TO_KPA: 100,
        HR_TO_SEC: 3600
    }
};