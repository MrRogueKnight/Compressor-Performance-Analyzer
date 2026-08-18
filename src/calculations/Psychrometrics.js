/**
 * Psychrometric Calculations
 * Reference: ASME PTC 10 - Centrifugal Compressors
 * Optimized version - faster wet bulb convergence, LRU cached computations
 */
import { THERMO } from '../constants/thermo.js';
import { Utils } from '../utils/utils.js';

export class Psychrometrics {
    static _saturationCache = new Map();
    static _MAX_CACHE_SIZE = 1000;
    static _CACHE_TTL_MS = 300000; // 5 minute TTL

    static saturationPressure(T) {
        // Guard against NaN/undefined/null
        if (typeof T !== 'number' || !isFinite(T) || T <= 0) {
            return 0;
        }

        const cacheKey = Math.round(T * 10);
        const cached = this._saturationCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < this._CACHE_TTL_MS)) {
            return cached.value;
        }

        const T_C = T - 273.15;
        const clamped = Utils.clamp(T_C, -40, 50);
        const c = THERMO.PSYCHROMETRIC;
        const result = c.SATURATION_COEFF *
            Math.exp((c.TETENS_A * clamped) / (clamped + c.TETENS_B));

        // Evict oldest entry if cache is full
        if (this._saturationCache.size >= this._MAX_CACHE_SIZE) {
            let oldestKey = null;
            let oldestTime = Infinity;
            for (const [key, entry] of this._saturationCache) {
                if (entry.timestamp < oldestTime) {
                    oldestTime = entry.timestamp;
                    oldestKey = key;
                }
            }
            if (oldestKey !== null) {
                this._saturationCache.delete(oldestKey);
            }
        }
        
        this._saturationCache.set(cacheKey, { value: result, timestamp: Date.now() });
        return result;
    }

    static clearCache() {
        this._saturationCache.clear();
    }

    static vaporPressure(RH, Psat) {
        return (Utils.clamp(RH, 0, 100) / 100) * Psat;
    }

    static humidityRatio(Pv, P) {
        if (P <= Pv) return Infinity;
        return THERMO.PSYCHROMETRIC.HUMIDITY_RATIO_COEFF * Pv / (P - Pv);
    }

    static moleFraction(Pv, P) {
        return P <= 0 ? 0 : Utils.clamp(Pv / P, 0, 1);
    }

    static density(P, Pv, T) {
        if (T <= 0) return 0;
        const R_dry = THERMO.GAS.R_AIR;
        const R_wet = THERMO.GAS.R_WATER;
        const Z = THERMO.GAS.Z_AIR;
        return (P - Pv) / (R_dry * T * Z) + Pv / (R_wet * T);
    }

    static specificVolume(rho) {
        return rho <= 0 ? Infinity : 1 / rho;
    }

    static enthalpy(T, W) {
        const T_C = T - 273.15;
        return 1.006 * T_C + W * (2501 + 1.84 * T_C);
    }

    static dewPointTemperature(Pv) {
        if (Pv <= 0) return -273.15;
        const c = THERMO.PSYCHROMETRIC;
        const ln = Math.log(Pv / c.SATURATION_COEFF);
        const Td = (c.TETENS_B * ln) / (c.TETENS_A - ln);
        return Utils.clamp(Td + 273.15, 200, 350);
    }

    static wetBulbTemperature(T, RH, P) {
        const T_C = T - 273.15;
        const Psat = this.saturationPressure(T);
        const Pv = this.vaporPressure(RH, Psat);
        const W = this.humidityRatio(Pv, P);

        let Twb = T_C - (100 - RH) * 0.12;
        if (RH < 50) Twb = T_C - (100 - RH) * 0.16;
        Twb = Utils.clamp(Twb, T_C - 15, T_C);

        for (let iter = 0; iter < 15; iter++) {
            const Twb_K = Twb + 273.15;
            const Psat_wb = this.saturationPressure(Twb_K);
            const W_wb = this.humidityRatio(Psat_wb, P);
            const h_air = this.enthalpy(T, W);
            const h_wb = this.enthalpy(Twb_K, W_wb);
            const h_fg = 2501 - 2.36 * Twb;
            const residual = h_air - h_wb - (W_wb - W) * h_fg;

            if (Math.abs(residual) < 0.001) break;

            const dT = 0.05;
            const Twb_plus = Twb + dT;
            const Psat_plus = this.saturationPressure(Twb_plus + 273.15);
            const W_plus = this.humidityRatio(Psat_plus, P);
            const h_plus = this.enthalpy(Twb_plus + 273.15, W_plus);
            const residual_plus = h_air - h_plus - (W_plus - W) * (2501 - 2.36 * Twb_plus);
            const derivative = (residual_plus - residual) / dT;

            if (Math.abs(derivative) < 1e-12) break;
            Twb = Twb - residual / derivative;
            Twb = Utils.clamp(Twb, T_C - 15, T_C + 2);
        }

        return Twb + 273.15;
    }

    static absoluteHumidity(W, P, T) {
        const rho = this.density(P, 0, T);
        return W * rho / (1 + W);
    }

    static wetMolecularWeight(Xw, MW_dry, MW_water) {
        MW_dry = MW_dry || THERMO.GAS.MW_AIR;
        MW_water = MW_water || THERMO.GAS.MW_WATER;
        return Xw * MW_water + (1 - Xw) * MW_dry;
    }

    static compressibilityRatio(Z_in, Z_out) {
        if (Z_in === 0) return 1;
        return Z_out / Z_in;
    }

    static waterIn(Xw_in, n_dry) {
        if (Xw_in >= 1) return Infinity;
        return (Xw_in / (1 - Xw_in)) * n_dry;
    }

    static waterOut(Xw_out, n_dry) {
        if (Xw_out >= 1) return Infinity;
        return (Xw_out / (1 - Xw_out)) * n_dry;
    }

    static checkCondensation(Xw_in, Xw_out) {
        return Xw_in > Xw_out;
    }

    static dryAirPressure(P_suction, P_partial) {
        return (P_suction - P_partial) / 1000;
    }

    static dryAirMoles(P_dry, Q, T, R) {
        R = R || THERMO.GAS.R_AIR;
        if (T <= 0) return 0;
        return (P_dry * Q) / (R * T) * (28.4 / 1000);
    }

    static wetAirMoles(P_in, Q, T, R) {
        R = R || THERMO.GAS.R_AIR;
        const T_K = T + 273.15;
        if (T_K <= 0) return 0;
        return (P_in * 1000 * Q) / (R * T_K) * (28.4 / 1000);
    }
}