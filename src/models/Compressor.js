/**
 * Compressor System Model
 * Manages multiple stages and overall system state
 */
import { THERMO } from '../constants/thermo.js';
import { Compression } from '../calculations/Compression.js';

export class Compressor {
    constructor(atmosphere) {
        this.atmosphere = atmosphere;
        this.stages = [];
        this.initialState = null;
        this.totalPower = null;
        this.totalCondensation = null;
        this.overallEfficiency = null;
        this.shaftPower = null;
        this.motorPower = null;
        this.totalHead = null;
        this.FAD = null;
        this.finalAirFlow = null;
        this.warnings = [];
        this.pvData = null;
        this.tsData = null;
        this.totalWaterIn = null;
        this.totalWaterOut = null;
        this.totalCondensationRate = null;
    }

    addStage(stage) {
        this.stages.push(stage);
        return this;
    }

    getStageCount() { return this.stages.length; }

    reset() {
        this.totalPower = null;
        this.totalCondensation = null;
        this.overallEfficiency = null;
        this.shaftPower = null;
        this.motorPower = null;
        this.totalHead = null;
        this.FAD = null;
        this.finalAirFlow = null;
        this.warnings = [];
        this.pvData = null;
        this.tsData = null;
        this.totalWaterIn = null;
        this.totalWaterOut = null;
        this.totalCondensationRate = null;
        
        this.stages.forEach(s => {
            s.power = null;
            s.condensation = null;
            s.remainingMoisture = null;
            s.polytropicEfficiency = null;
            s.pressureRatio = null;
            s.temperatureRatio = null;
            s.polytropicIndex = null;
            s.head = null;
            s.volumetricEfficiency = null;
            s.inputState.reset();
            s.outputState.reset();
            s.waterIn = null;
            s.waterOut = null;
            s.condensationRate = null;
        });
    }
}