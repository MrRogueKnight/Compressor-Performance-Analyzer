/**
 * Compressor Stage Data Model
 * Represents a single compression stage
 */
import { AirState } from './AirState.js';

export class Stage {
    constructor(number, pin, pout, tin, tout, efficiency) {
        efficiency = efficiency || 0.85;
        this.number = number;
        this.pin = pin;
        this.pout = pout;
        this.tin = tin;
        this.tout = tout;
        this.efficiency = efficiency;
        this.pressureRatio = null;
        this.temperatureRatio = null;
        this.polytropicIndex = null;
        this.polytropicEfficiency = null;
        this.power = null;
        this.condensation = null;
        this.remainingMoisture = null;
        this.head = null;
        this.volumetricEfficiency = null;
        this.inputState = new AirState();
        this.outputState = new AirState();
        this.isentropicTemp = null;
        this.waterIn = null;
        this.waterOut = null;
        this.condensationRate = null;
    }

    validate() {
        if (this.pin <= 0 || this.pout <= 0) {
            throw new Error("Stage " + this.number + ": Pressures must be positive");
        }
        if (this.pout <= this.pin) {
            throw new Error("Stage " + this.number + ": Outlet pressure must exceed inlet");
        }
        if (this.tout <= this.tin) {
            throw new Error("Stage " + this.number + ": Outlet temperature must exceed inlet");
        }
        if (this.efficiency <= 0 || this.efficiency > 1) {
            throw new Error("Stage " + this.number + ": Efficiency must be between 0 and 1");
        }
    }
}