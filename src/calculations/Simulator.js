/**
 * Simulation Engine
 * Optimized: Reduced variable lookups, better state management
 */
import { THERMO } from '../constants/thermo.js';
import { Utils } from '../utils/utils.js';
import { Units } from '../utils/units.js';
import { Psychrometrics } from './Psychrometrics.js';
import { Compression } from './Compression.js';
import { AirState } from '../models/AirState.js';

export class Simulator {
    constructor(compressor) {
        this.compressor = compressor;
        this.progress = 0;
    }

    run(progressCallback) {
        try {
            this.progress = 0;
            this.compressor.reset();
            this.compressor.warnings = [];

            this.updateProgress(5, progressCallback);

            const si = this.compressor.atmosphere.toSI();
            const initialState = this.createInitialState(si);
            this.compressor.initialState = initialState;

            this.calculatePsychrometrics(initialState);
            this.updateProgress(15, progressCallback);

            this.calculateDerivedProperties(initialState);

            let currentState = initialState.clone();
            let totalPower = 0, totalCond = 0, totalHead = 0;
            let currentAirFlow = initialState.airFlow;
            let totalWaterIn = 0, totalWaterOut = 0;

            // Cache DOM lookups
            const compressionType = document.getElementById('compressionType').value;
            const mechEff = parseFloat(document.getElementById('mechEfficiency').value) || 0.95;
            const motorEff = parseFloat(document.getElementById('motorEfficiency').value) || 0.92;
            const intercoolerEff = this.compressor.atmosphere.intercoolerEff;
            const pressureLoss = this.compressor.atmosphere.pressureLoss;
            const pressureLossKPa = pressureLoss * THERMO.UNITS.BAR_TO_KPA;
            const stageCount = this.compressor.stages.length;

            const pvPoints = [];
            const tsPoints = [];
            const stages = this.compressor.stages;

            for (let i = 0; i < stageCount; i++) {
                const stage = stages[i];
                stage.inputState = currentState.clone();
                stage.inputState.airFlow = currentAirFlow;

                // Apply intercooler pressure loss after first stage
                if (i > 0) {
                    stage.inputState.pressure -= pressureLossKPa;
                }

                // Calculate dry air moles if not set
                let n_dry = stage.inputState.dryAirMoles;
                if (!n_dry || n_dry <= 0) {
                    n_dry = Psychrometrics.dryAirMoles(
                        stage.inputState.dryAirPressure || (stage.inputState.pressure - (stage.inputState.vaporPressure || 0)),
                        stage.inputState.airFlow || 0.1,
                        stage.inputState.temperature ? stage.inputState.temperature - 273.15 : 25
                    );
                    stage.inputState.dryAirMoles = n_dry;
                }

                const Xw_in = stage.inputState.moleFraction || 0;
                stage.waterIn = Psychrometrics.waterIn(Xw_in, n_dry);
                totalWaterIn += stage.waterIn;

                this.processStage(stage, compressionType);

                const Xw_out = stage.outputState.moleFraction || 0;
                stage.waterOut = Psychrometrics.waterOut(Xw_out, n_dry);
                stage.condensationRate = Math.max(0, stage.waterIn - stage.waterOut);
                totalWaterOut += stage.waterOut;

                // Update air flow for next stage
                currentAirFlow = stage.remainingMoisture;
                if (!currentAirFlow || currentAirFlow <= 0) {
                    currentAirFlow = stage.inputState.airFlow * 0.99;
                }

                // Apply intercooling between stages
                if (i < stageCount - 1) {
                    const intercooledTemp = this.compressor.atmosphere.temperature +
                        (stage.tout - this.compressor.atmosphere.temperature) * (1 - intercoolerEff);
                    stage.outputState.temperature = Units.celsiusToKelvin(intercooledTemp);
                    this.calculatePsychrometrics(stage.outputState);
                    stage.outputState.dewPoint = Psychrometrics.dewPointTemperature(stage.outputState.vaporPressure);
                    stage.outputState.entropy = this.calculateEntropy(stage.outputState);
                }

                // Generate P-V and T-S curve data
                const P1 = stage.inputState.pressure;
                const V1 = stage.inputState.specificVolume || 0.8 / (i + 1);
                const P2 = stage.outputState.pressure;
                const V2 = stage.outputState.specificVolume || 0.8 / (i + 2);
                const n = stage.polytropicIndex || 1.4;

                pvPoints.push({
                    stage: i + 1,
                    points: Compression.generatePVCuvre(P1, V1, P2, V2, n)
                });

                const T1 = stage.inputState.temperature;
                const S1 = stage.inputState.entropy || (i + 1) * 0.05;
                const T2 = stage.outputState.temperature;
                const S2 = stage.outputState.entropy || (i + 2) * 0.05;
                tsPoints.push({
                    stage: i + 1,
                    points: Compression.generateTSCurve(T1, S1, T2, S2)
                });

                currentState = stage.outputState.clone();
                currentState.airFlow = currentAirFlow;

                totalPower += stage.power || 0;
                totalCond += stage.condensation || 0;
                totalHead += stage.head || 0;

                // Check for efficiency warnings
                if (stage.polytropicEfficiency < 65) {
                    this.compressor.warnings.push(
                        `Stage ${stage.number}: Efficiency ${stage.polytropicEfficiency.toFixed(1)}% below typical range`
                    );
                }

                const pct = 15 + ((i + 1) * 75) / stageCount;
                this.updateProgress(pct, progressCallback);
            }

            // Set final compressor state
            this.compressor.pvData = pvPoints;
            this.compressor.tsData = tsPoints;
            this.compressor.totalPower = totalPower;
            this.compressor.totalCondensation = totalCond;
            this.compressor.totalHead = totalHead;
            this.compressor.shaftPower = totalPower / mechEff;
            this.compressor.motorPower = this.compressor.shaftPower / motorEff;
            this.compressor.totalWaterIn = totalWaterIn;
            this.compressor.totalWaterOut = totalWaterOut;
            this.compressor.totalCondensationRate = totalWaterIn - totalWaterOut;

            const totalIsen = this.calculateTotalIsentropicPower();
            this.compressor.overallEfficiency = Compression.efficiencyFromPower(totalIsen, totalPower);

            this.compressor.FAD = Compression.freeAirDelivery(
                initialState.airFlow,
                THERMO.STANDARD.TEMPERATURE,
                THERMO.STANDARD.PRESSURE,
                initialState.temperature,
                initialState.pressure
            );
            this.compressor.finalAirFlow = currentAirFlow;

            this.updateProgress(100, progressCallback);
            return this.compressor;

        } catch (error) {
            throw error;
        }
    }

    createInitialState(si) {
        const state = new AirState();
        state.pressure = si.pressure;
        state.temperature = si.temperature;
        state.humidity = si.humidity;
        state.airFlow = si.airFlow;
        state.gasConstant = si.gasConstant;
        state.k = si.k;
        state.compressibility = THERMO.GAS.Z_AIR;
        return state;
    }

    calculatePsychrometrics(state) {
        const { pressure: P, temperature: T, humidity: RH } = state;
        state.saturationPressure = Psychrometrics.saturationPressure(T);
        state.vaporPressure = Psychrometrics.vaporPressure(RH, state.saturationPressure);
        state.humidityRatio = Psychrometrics.humidityRatio(state.vaporPressure, P);
        state.moleFraction = Psychrometrics.moleFraction(state.vaporPressure, P);
        state.density = Psychrometrics.density(P, state.vaporPressure, T);
        state.specificVolume = Psychrometrics.specificVolume(state.density);
        state.enthalpy = Psychrometrics.enthalpy(T, state.humidityRatio);
        state.dewPoint = Psychrometrics.dewPointTemperature(state.vaporPressure);
        state.wetBulb = Psychrometrics.wetBulbTemperature(T, RH, P);
        state.absoluteHumidity = Psychrometrics.absoluteHumidity(state.humidityRatio, P, T);
        state.molecularWeight = Psychrometrics.wetMolecularWeight(state.moleFraction);
        state.dryAirPressure = Psychrometrics.dryAirPressure(P, state.vaporPressure);
        state.dryAirMoles = Psychrometrics.dryAirMoles(state.dryAirPressure, state.airFlow, T - 273.15);
        state.wetAirMoles = Psychrometrics.wetAirMoles(P, state.airFlow, T - 273.15);
        return state;
    }

    calculateDerivedProperties(state) {
        state.dewPoint = Psychrometrics.dewPointTemperature(state.vaporPressure);
        state.wetBulb = Psychrometrics.wetBulbTemperature(state.temperature, state.humidity, state.pressure);
        state.absoluteHumidity = Psychrometrics.absoluteHumidity(state.humidityRatio, state.pressure, state.temperature);
        state.entropy = this.calculateEntropy(state);
        state.molecularWeight = Psychrometrics.wetMolecularWeight(state.moleFraction);
    }

    calculateEntropy(state) {
        const { temperature: T, pressure: P, gasConstant: R = THERMO.GAS.R_AIR, k } = state;
        const cp = k ? (k * R) / (k - 1) : THERMO.GAS.CP_AIR;
        return cp * Utils.safeLog(T / 273.15) - R * Utils.safeLog(P / 101.325);
    }

    processStage(stage, compressionType) {
        const { pin, pout, tin, tout } = stage;
        const pin_kPa = Units.barToKPa(pin);
        const pout_kPa = Units.barToKPa(pout);
        const tin_K = Units.celsiusToKelvin(tin);
        const tout_K = Units.celsiusToKelvin(tout);

        stage.pressureRatio = Compression.pressureRatio(pin_kPa, pout_kPa);
        stage.temperatureRatio = Compression.temperatureRatio(tin_K, tout_K);

        const { k, gasConstant: R } = this.compressor.atmosphere;
        const m_dot = stage.inputState.airFlow || 0.1;

        const Z_in = stage.inputState.compressibility || 1;
        const Z_out = 1;
        const ZR = Psychrometrics.compressibilityRatio(Z_in, Z_out);

        stage.polytropicIndex = Compression.polytropicIndex(k, stage.pressureRatio, stage.temperatureRatio, ZR);
        stage.polytropicEfficiency = Compression.polytropicEfficiencyDirect(k, stage.pressureRatio, stage.temperatureRatio, ZR);
        stage.head = Compression.polytropicHead(R, tin_K, stage.pressureRatio, stage.polytropicIndex);

        // Calculate power based on compression type
        let power = 0;
        switch (compressionType) {
            case 'isentropic':
                power = Compression.isentropicPower(m_dot, R, tin_K, pin_kPa, pout_kPa, k);
                stage.polytropicIndex = k;
                break;
            case 'isothermal':
                power = Compression.isothermalPower(m_dot, R, tin_K, pin_kPa, pout_kPa);
                stage.polytropicIndex = 1;
                break;
            default:
                power = Compression.polytropicPower(m_dot, R, tin_K, pin_kPa, pout_kPa, stage.polytropicIndex);
                break;
        }

        stage.power = power;
        stage.isentropicTemp = Compression.isentropicDischargeTemp(tin_K, pin_kPa, pout_kPa, k);
        stage.volumetricEfficiency = Compression.volumetricEfficiency(stage.pressureRatio);

        // Set output state
        stage.outputState.pressure = pout_kPa;
        stage.outputState.temperature = tout_K;
        stage.outputState.airFlow = m_dot;
        stage.outputState.humidity = stage.inputState.humidity;
        stage.outputState.gasConstant = R;
        stage.outputState.k = k;

        const Xw_in = stage.inputState.moleFraction || 0;
        const Pv_sat = Psychrometrics.saturationPressure(tout_K);
        const Pv_out = Psychrometrics.vaporPressure(Math.min(stage.inputState.humidity, 80), Pv_sat);
        const Xw_out = Psychrometrics.moleFraction(Pv_out, pout_kPa);

        stage.outputState.moleFraction = Xw_out;
        stage.condensationCheck = Psychrometrics.checkCondensation(Xw_in, Xw_out);

        if (stage.condensationCheck) {
            const deltaW = Math.max(0, Xw_in - Xw_out);
            stage.condensation = m_dot * deltaW * 0.5;
        } else {
            stage.condensation = 0;
        }

        stage.remainingMoisture = m_dot * (1 - (stage.condensation / m_dot || 0));

        this.calculatePsychrometrics(stage.outputState);
        stage.outputState.dewPoint = Psychrometrics.dewPointTemperature(stage.outputState.vaporPressure);
        stage.outputState.entropy = this.calculateEntropy(stage.outputState);

        return stage;
    }

    calculateTotalIsentropicPower() {
        const { gasConstant: R, k } = this.compressor.atmosphere;
        let total = 0;

        for (let i = 0; i < this.compressor.stages.length; i++) {
            const stage = this.compressor.stages[i];
            const pin_kPa = Units.barToKPa(stage.pin);
            const pout_kPa = Units.barToKPa(stage.pout);
            const tin_K = Units.celsiusToKelvin(stage.tin);
            const m_dot = stage.inputState.airFlow || 0.1;
            total += Compression.isentropicPower(m_dot, R, tin_K, pin_kPa, pout_kPa, k);
        }

        return total;
    }

    updateProgress(value, callback) {
        this.progress = Math.min(100, value);
        if (callback) callback(this.progress, 'Processing...');
    }

    generateReport() {
        const c = this.compressor;
        const stages = c.stages;
        const finalFlow = stages.length > 0
            ? (stages[stages.length - 1].remainingMoisture || c.atmosphere.airFlow / 3600) * 3600
            : c.atmosphere.airFlow;

        return {
            timestamp: new Date().toISOString(),
            input: {
                humidity: c.atmosphere.humidity,
                pressure: c.atmosphere.pressure,
                temperature: c.atmosphere.temperature,
                airFlow: c.atmosphere.airFlow,
                k: c.atmosphere.k,
                stageCount: c.getStageCount(),
                intercoolerEff: c.atmosphere.intercoolerEff,
                pressureLoss: c.atmosphere.pressureLoss,
                compressionType: document.getElementById('compressionType').value
            },
            psychrometric: c.initialState ? {
                saturationPressure: c.initialState.saturationPressure,
                vaporPressure: c.initialState.vaporPressure,
                humidityRatio: c.initialState.humidityRatio,
                moleFraction: c.initialState.moleFraction,
                density: c.initialState.density,
                dewPoint: c.initialState.dewPoint,
                wetBulb: c.initialState.wetBulb,
                absoluteHumidity: c.initialState.absoluteHumidity,
                enthalpy: c.initialState.enthalpy,
                molecularWeight: c.initialState.molecularWeight
            } : null,
            stages: stages.map(s => ({
                number: s.number,
                pressureRatio: s.pressureRatio,
                temperatureRatio: s.temperatureRatio,
                polytropicIndex: s.polytropicIndex,
                efficiency: s.polytropicEfficiency,
                power: s.power,
                condensation: s.condensation,
                remainingMoisture: s.remainingMoisture,
                head: s.head,
                volumetricEfficiency: s.volumetricEfficiency,
                isentropicTemp: s.isentropicTemp,
                waterIn: s.waterIn,
                waterOut: s.waterOut,
                condensationRate: s.condensationRate,
                condensationCheck: s.condensationCheck
            })),
            summary: {
                totalPower: c.totalPower,
                totalCondensation: c.totalCondensation,
                overallEfficiency: c.overallEfficiency,
                shaftPower: c.shaftPower,
                motorPower: c.motorPower,
                totalHead: c.totalHead,
                FAD: c.FAD,
                finalAirFlow: finalFlow,
                totalWaterIn: c.totalWaterIn,
                totalWaterOut: c.totalWaterOut,
                totalCondensationRate: c.totalCondensationRate
            },
            warnings: c.warnings
        };
    }
}