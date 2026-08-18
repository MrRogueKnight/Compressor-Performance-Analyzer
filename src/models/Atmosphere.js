/**
 * Atmosphere Conditions Model
 * Stores atmospheric and environmental parameters
 */
import { Units } from '../utils/units.js';

export class Atmosphere {
    constructor(humidity, pressure, temperature, airFlow, intercoolerEff, pressureLoss,
        mwDryAir, mwWater, gasConstant, k) {
        intercoolerEff = intercoolerEff || 0.85;
        pressureLoss = pressureLoss || 0.02;
        mwDryAir = mwDryAir || 28.97;
        mwWater = mwWater || 18.015;
        gasConstant = gasConstant || 0.287;
        k = k || 1.4;
        this.humidity = humidity;
        this.pressure = pressure;
        this.temperature = temperature;
        this.airFlow = airFlow;
        this.intercoolerEff = intercoolerEff;
        this.pressureLoss = pressureLoss;
        this.mwDryAir = mwDryAir;
        this.mwWater = mwWater;
        this.gasConstant = gasConstant;
        this.k = k;
        this.cp = (k * gasConstant) / (k - 1);
        this.cv = gasConstant / (k - 1);
    }

    toSI() {
        return {
            humidity: this.humidity,
            pressure: Units.barToKPa(this.pressure),
            temperature: Units.celsiusToKelvin(this.temperature),
            airFlow: Units.kgHrToKgSec(this.airFlow),
            gasConstant: this.gasConstant,
            k: this.k,
            intercoolerEff: this.intercoolerEff,
            pressureLoss: this.pressureLoss
        };
    }
}