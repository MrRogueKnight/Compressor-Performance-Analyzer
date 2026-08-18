/**
 * Compression Calculations
 * Reference: ASME PTC 10 - Centrifugal Compressors
 */
import { THERMO } from '../constants/thermo.js';
import { Utils } from '../utils/utils.js';

export class Compression {
    static pressureRatio(Pin, Pout) {
        return Pin <= 0 ? Infinity : Pout / Pin;
    }

    static temperatureRatio(Tin, Tout) {
        return Tin <= 0 ? Infinity : Tout / Tin;
    }

    static polytropicIndex(k, PR, TR, ZR) {
        ZR = ZR || 1;
        if (PR <= 1 || TR <= 1) return k;
        const lnPR = Utils.safeLog(PR);
        const lnTR = Utils.safeLog(TR);
        if (lnPR === 0) return k;
        const denominator = lnTR + Utils.safeLog(ZR);
        if (denominator === 0) return k;
        return Utils.clamp(lnPR / denominator, 1.1, 2.5);
    }

    static polytropicEfficiency(k, n) {
        if (n === 0 || k === 0) return 70;
        const eta = ((n - 1) / (k - 1)) * (k / n) * 100;
        return Utils.clamp(eta, THERMO.COMPRESSOR.EFFICIENCY_MIN, THERMO.COMPRESSOR.EFFICIENCY_MAX);
    }

    static polytropicEfficiencyDirect(k, PR, TR, ZR) {
        ZR = ZR || 1;
        if (PR <= 1 || TR <= 1) return 70;
        const numerator = ((k - 1) / k) * Utils.safeLog(PR);
        const denominator = Utils.safeLog(TR * ZR);
        if (denominator === 0) return 70;
        const eta = (numerator / denominator) * 100;
        return Utils.clamp(eta, THERMO.COMPRESSOR.EFFICIENCY_MIN, THERMO.COMPRESSOR.EFFICIENCY_MAX);
    }

    static polytropicHead(R, T1, PR, n) {
        if (PR <= 1) return 0;
        const exponent = (n - 1) / n;
        const ratio = Utils.safePow(PR, exponent);
        return R * T1 * (n / (n - 1)) * (ratio - 1);
    }

    static polytropicPower(m_dot, R, Tin, Pin, Pout, n) {
        if (m_dot <= 0 || R <= 0 || Tin <= 0 || Pin <= 0 || Pout <= 0) return 0;
        const PR = this.pressureRatio(Pin, Pout);
        if (PR <= 1) return 0;
        if (Math.abs(n - 1) < 1e-10) {
            return m_dot * R * Tin * Utils.safeLog(PR);
        }
        const exponent = (n - 1) / n;
        const ratio = Utils.safePow(PR, exponent);
        return m_dot * R * Tin * (n / (n - 1)) * (ratio - 1);
    }

    static isentropicPower(m_dot, R, Tin, Pin, Pout, k) {
        if (m_dot <= 0 || R <= 0 || Tin <= 0 || Pin <= 0 || Pout <= 0) return 0;
        const PR = this.pressureRatio(Pin, Pout);
        if (PR <= 1) return 0;
        const exponent = (k - 1) / k;
        const ratio = Utils.safePow(PR, exponent);
        return m_dot * R * Tin * (k / (k - 1)) * (ratio - 1);
    }

    static isothermalPower(m_dot, R, Tin, Pin, Pout) {
        if (m_dot <= 0 || R <= 0 || Tin <= 0 || Pin <= 0 || Pout <= 0) return 0;
        const PR = this.pressureRatio(Pin, Pout);
        if (PR <= 1) return 0;
        return m_dot * R * Tin * Utils.safeLog(PR);
    }

    static efficiencyFromPower(P_isen, P_actual) {
        if (P_actual <= 0 || P_isen <= 0) return 85;
        const eta = (P_isen / P_actual) * 100;
        return Utils.clamp(eta, THERMO.COMPRESSOR.EFFICIENCY_MIN, THERMO.COMPRESSOR.EFFICIENCY_MAX);
    }

    static isentropicDischargeTemp(T1, P1, P2, k) {
        if (T1 <= 0 || P1 <= 0 || P2 <= 0) return T1;
        const PR = this.pressureRatio(P1, P2);
        if (PR <= 1) return T1;
        const exponent = (k - 1) / k;
        return T1 * Utils.safePow(PR, exponent);
    }

    static volumetricEfficiency(PR, clearance) {
        clearance = clearance || THERMO.COMPRESSOR.CLEARANCE_FACTOR;
        if (PR <= 1) return 1;
        return 1 - clearance * (Utils.safePow(PR, 1 / THERMO.GAS.GAMMA) - 1);
    }

    static freeAirDelivery(m_dot, T_std, P_std, T_in, P_in) {
        const rho_std = P_std / (THERMO.GAS.R_AIR * T_std);
        return m_dot / rho_std;
    }

    static generatePVCuvre(initialP, initialV, finalP, finalV, n) {
        const points = [];
        const steps = 50;
        for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const V = initialV + (finalV - initialV) * frac;
            const P = initialP * Math.pow(initialV / V, n);
            points.push({ V: V, P: P });
        }
        return points;
    }

    static generateTSCurve(initialT, initialS, finalT, finalS) {
        const points = [];
        const steps = 50;
        for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const S = initialS + (finalS - initialS) * frac;
            const T = initialT + (finalT - initialT) * frac;
            points.push({ S: S, T: T });
        }
        return points;
    }
}