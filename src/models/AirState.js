/**
 * Air State Data Model
 * Represents the thermodynamic state of air at a point
 */
export class AirState {
    constructor() {
        this.pressure = null;
        this.temperature = null;
        this.humidity = null;
        this.airFlow = null;
        this.saturationPressure = null;
        this.vaporPressure = null;
        this.humidityRatio = null;
        this.moleFraction = null;
        this.density = null;
        this.specificVolume = null;
        this.dewPoint = null;
        this.wetBulb = null;
        this.absoluteHumidity = null;
        this.enthalpy = null;
        this.gasConstant = null;
        this.k = null;
        this.entropy = null;
        this.compressibility = 1;
        this.molecularWeight = null;
        this.dryAirPressure = null;
        this.dryAirMoles = null;
        this.wetAirMoles = null;
        this.waterIn = null;
        this.waterOut = null;
        this.condensationCheck = false;
    }

    clone() {
        const copy = new AirState();
        Object.assign(copy, this);
        return copy;
    }

    reset() {
        Object.keys(this).forEach(key => {
            this[key] = null;
        });
    }
}