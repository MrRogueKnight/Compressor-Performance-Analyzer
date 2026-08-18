/**
 * Main Application Controller
 * Coordinates all modules - lightweight, delegates to specialized modules
 */
import { Atmosphere } from '../models/Atmosphere.js';
import { Compressor } from '../models/Compressor.js';
import { Stage } from '../models/Stage.js';
import { Simulator } from '../calculations/Simulator.js';
import { ChartManager } from '../charts/ChartManager.js';
import { ResultsRenderer } from '../ui/ResultsRenderer.js';
import { AtmosphericRenderer } from '../ui/AtmosphericRenderer.js';
import { EnergyRenderer } from '../ui/EnergyRenderer.js';
import { CarbonRenderer } from '../ui/CarbonRenderer.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { Utils } from '../utils/utils.js';
import { Units } from '../utils/units.js';
import { THERMO } from '../constants/thermo.js';

export class Controller {
    constructor() {
        this.compressor = null;
        this.simulator = null;
        this.report = null;
        this.charts = new ChartManager();
        this.resultsRenderer = new ResultsRenderer(this);
        this.atmosphericRenderer = new AtmosphericRenderer();
        this.energyRenderer = new EnergyRenderer();
        this.carbonRenderer = new CarbonRenderer();
        this.progressBar = new ProgressBar();

        this.initializeEvents();
        this.initializeNavigation();

        const savedTheme = localStorage.getItem('compressor-analyzer-theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-mode');
            const themeBtn = this._getElement('themeToggle');
            if (themeBtn) themeBtn.innerHTML = '<span class="icon">🌙</span> Dark';
        }

        setTimeout(() => this.generateStages(), 100);
    }

    _getElement(id) {
        return document.getElementById(id);
    }

    initializeEvents() {
        this._addListener('generateBtn', 'click', () => this.generateStages());
        this._addListener('autoFillBtn', 'click', () => this.autoFill());
        this._addListener('calculateBtn', 'click', () => this.runSimulation());
        this._addListener('autoRunBtn', 'click', () => {
            this.autoFill();
            setTimeout(() => this.runSimulation(), 300);
        });
        this._addListener('exportBtn', 'click', () => this.exportReport());
        this._addListener('exportCSVBtn', 'click', () => this.exportCSV());
        this._addListener('exportPDFBtn', 'click', () => this.exportPDF());
        this._addListener('clearBtn', 'click', () => this.clearResults());
        this._addListener('exportChartsBtn', 'click', () => this.exportCharts());
        this._addListener('saveProjectBtn', 'click', () => this.saveProject());
        this._addListener('loadProjectBtn', 'click', () => this.loadProject());
        this._addListener('compareBtn', 'click', () => this.compareConfigurations());
        this._addListener('themeToggle', 'click', () => this.toggleTheme());

        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => this.validateInputs());
        });
    }

    _addListener(id, event, handler) {
        const el = this._getElement(id);
        if (el) {
            el.addEventListener(event, handler);
        }
    }

    initializeNavigation() {
        document.querySelectorAll('.sidebar li').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                const section = this._getElement(item.dataset.section);
                if (section) section.classList.add('active');
            });
        });
    }

    toggleTheme() {
        const isLight = document.documentElement.classList.toggle('light-mode');
        localStorage.setItem('compressor-analyzer-theme', isLight ? 'light' : 'dark');
        const btn = this._getElement('themeToggle');
        if (btn) {
            btn.innerHTML = isLight 
                ? '<span class="icon">🌙</span> Dark' 
                : '<span class="icon">🌓</span> Light';
        }
    }

    generateStages() {
        const container = this._getElement('stageContainer');
        if (!container) return;
        
        const stageCountEl = this._getElement('stageCount');
        let count = stageCountEl ? (parseInt(stageCountEl.value) || 5) : 5;
        count = Math.min(20, Math.max(1, count));
        if (stageCountEl) stageCountEl.value = count;
        container.innerHTML = '';

        for (let i = 1; i <= count; i++) {
            const card = document.createElement('div');
            card.className = 'stage-card';
            card.innerHTML = `
                <div class="stage-header">
                    <h3>Stage ${i}</h3>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="stage-number">#${i}</span>
                        ${i > 1 ? `<button class="copy-stage-btn" data-stage="${i}" data-prev="${i - 1}">📋 Copy Stage ${i - 1}</button>` : ''}
                    </div>
                </div>
                <div class="grid grid-4">
                    <div class="input-group"><label>Inlet Pressure</label><input type="number" id="pin${i}" step="0.0001" placeholder="0.9932" /><span class="hint">bar</span></div>
                    <div class="input-group"><label>Outlet Pressure</label><input type="number" id="pout${i}" step="0.0001" placeholder="2.319" /><span class="hint">bar</span></div>
                    <div class="input-group"><label>Inlet Temperature</label><input type="number" id="tin${i}" step="0.1" placeholder="34" /><span class="hint">°C</span></div>
                    <div class="input-group"><label>Outlet Temperature</label><input type="number" id="tout${i}" step="0.1" placeholder="95" /><span class="hint">°C</span></div>
                    <div class="input-group"><label>Stage Efficiency</label><input type="number" id="stageEff${i}" step="0.01" value="0.85" placeholder="0.85" /><span class="hint">0-1</span></div>
                </div>`;
            container.appendChild(card);
        }

        document.querySelectorAll('.copy-stage-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetStage = parseInt(btn.dataset.stage);
                const sourceStage = parseInt(btn.dataset.prev);
                this.copyStageData(sourceStage, targetStage);
            });
        });
    }

    copyStageData(source, target) {
        ['pin', 'pout', 'tin', 'tout', 'stageEff'].forEach(field => {
            const sourceEl = this._getElement(field + source);
            const targetInput = this._getElement(field + target);
            if (targetInput && sourceEl) {
                targetInput.value = sourceEl.value;
                targetInput.dispatchEvent(new Event('input'));
            }
        });
        this.showSaveStatus(`Copied Stage ${source} to Stage ${target}`, 'success');
    }

    autoFill() {
        const stageCountEl = this._getElement('stageCount');
        let count = stageCountEl ? (parseInt(stageCountEl.value) || 5) : 5;
        count = Math.min(20, Math.max(1, count));

        this._setValue('humidity', Utils.random(50, 80).toFixed(1));
        this._setValue('pressure', Utils.random(0.95, 1.05).toFixed(4));
        this._setValue('temperature', Utils.random(25, 35).toFixed(1));
        this._setValue('airFlow', Utils.random(800, 2000).toFixed(0));
        this._setValue('intercoolerEfficiency', Utils.random(0.75, 0.92).toFixed(2));
        this._setValue('pressureLoss', Utils.random(0.01, 0.04).toFixed(3));

        let currentPressure = 0.9932;
        for (let i = 1; i <= count; i++) {
            const pr = Utils.random(2.0, 3.2);
            const tr = Utils.random(1.5, 2.2);
            const pin = currentPressure;
            const pout = pin * pr;
            const tin = Utils.random(25, 35);
            const tout = tin * tr;
            this._setValue('pin' + i, pin.toFixed(4));
            this._setValue('pout' + i, pout.toFixed(4));
            this._setValue('tin' + i, tin.toFixed(1));
            this._setValue('tout' + i, tout.toFixed(1));
            this._setValue('stageEff' + i, Utils.random(0.78, 0.90).toFixed(2));
            currentPressure = pout;
        }
        this.progressBar.show('Auto-filled with random data', 100);
    }

    _setValue(id, value) {
        const el = this._getElement(id);
        if (el) el.value = value;
    }

    validateInputs() {
        const fields = [
            { id: 'humidity', min: 0, max: 100 },
            { id: 'pressure', min: 0.01, max: 100 },
            { id: 'temperature', min: -50, max: 150 },
            { id: 'airFlow', min: 1, max: 100000 },
            { id: 'intercoolerEfficiency', min: 0, max: 1 },
            { id: 'mechEfficiency', min: 0, max: 1 },
            { id: 'motorEfficiency', min: 0, max: 1 }
        ];

        let allValid = true;
        fields.forEach(f => {
            const input = this._getElement(f.id);
            if (!input) return;
            const value = parseFloat(input.value);
            const isValid = !isNaN(value) && value >= f.min && value <= f.max;
            input.classList.remove('validation-error', 'validation-success');
            input.classList.add(isValid ? 'validation-success' : 'validation-error');
            if (!isValid) allValid = false;
        });

        const stageCountEl = this._getElement('stageCount');
        const count = Math.min(20, Math.max(1, stageCountEl ? (parseInt(stageCountEl.value) || 5) : 5));
        for (let j = 1; j <= count; j++) {
            const pinEl = this._getElement('pin' + j);
            const poutEl = this._getElement('pout' + j);
            const tinEl = this._getElement('tin' + j);
            const toutEl = this._getElement('tout' + j);

            if (pinEl && poutEl) {
                const pin = parseFloat(pinEl.value);
                const pout = parseFloat(poutEl.value);
                if (!isNaN(pin) && !isNaN(pout) && pout <= pin) {
                    poutEl.classList.add('validation-error');
                    allValid = false;
                }
            }
            if (tinEl && toutEl) {
                const tin = parseFloat(tinEl.value);
                const tout = parseFloat(toutEl.value);
                if (!isNaN(tin) && !isNaN(tout) && tout <= tin) {
                    toutEl.classList.add('validation-error');
                    allValid = false;
                }
            }
        }
        return allValid;
    }

    runSimulation() {
        try {
            if (!this.validateInputs()) {
                this.progressBar.show('Please fix validation errors', 100);
                setTimeout(() => this.progressBar.hide(), 2000);
                return;
            }

            this.progressBar.show('Running simulation...', 0);

            const humidity = parseFloat(this._getElement('humidity')?.value) || 60;
            const pressure = parseFloat(this._getElement('pressure')?.value) || 0.9932;
            const temperature = parseFloat(this._getElement('temperature')?.value) || 34;
            const airFlow = parseFloat(this._getElement('airFlow')?.value) || 1000;
            const k = parseFloat(this._getElement('specificHeatRatio')?.value) || 1.4;
            const R = parseFloat(this._getElement('gasConstant')?.value) || 0.287;
            const intercoolerEff = parseFloat(this._getElement('intercoolerEfficiency')?.value) || 0.85;
            const pressureLoss = parseFloat(this._getElement('pressureLoss')?.value) || 0.02;

            const atm = new Atmosphere(humidity, pressure, temperature, airFlow, intercoolerEff, pressureLoss, 28.97, 18.015, R, k);
            const comp = new Compressor(atm);
            const stageCountEl = this._getElement('stageCount');
            const count = Math.min(20, Math.max(1, stageCountEl ? (parseInt(stageCountEl.value) || 5) : 5));

            for (let i = 1; i <= count; i++) {
                const pin = this._getFloatValue('pin' + i);
                const pout = this._getFloatValue('pout' + i);
                const tin = this._getFloatValue('tin' + i);
                const tout = this._getFloatValue('tout' + i);
                const eff = this._getFloatValue('stageEff' + i, 0.85);

                if (!isNaN(pin) && !isNaN(pout) && !isNaN(tin) && !isNaN(tout)) {
                    comp.addStage(new Stage(i, pin, pout, tin, tout, eff));
                }
            }

            this.compressor = comp;
            this.simulator = new Simulator(comp);

            this.simulator.run((progress, status) => {
                this.progressBar.show(status, progress);
            });

            this.report = this.simulator.generateReport();

            const resultsContainer = this._getElement('resultsContainer');
            if (!resultsContainer) {
                this.progressBar.show('Results container not found', 100);
                return;
            }

            this.resultsRenderer.render(this.report, this.compressor);
            this.atmosphericRenderer.render(this.compressor);

            const energyData = this.energyRenderer.render(this.report, resultsContainer);
            this.carbonRenderer.render(this.report, energyData, resultsContainer);

            this.charts.initialize(this.report);

            if (this.report.warnings && this.report.warnings.length > 0) {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'warning-banner warning';
                warningDiv.innerHTML = `⚠️ ${this.report.warnings.length} warning(s) detected.`;
                resultsContainer.prepend(warningDiv);
            }

            const condWarnings = this.checkCondensationWarnings(this.report);
            if (condWarnings.length > 0) {
                let warningHTML = '💧 Condensation Warnings:<br>';
                condWarnings.forEach(w => warningHTML += `• ${w.message}<br>`);
                resultsContainer.insertAdjacentHTML('beforeend', warningHTML);
            }

            const optimizationSection = this._getElement('optimization');
            if (optimizationSection) optimizationSection.style.display = 'block';
            this.optimizeEnergyCost();

            setTimeout(() => this.progressBar.hide(), 2000);

        } catch (error) {
            this.progressBar.show(`Error: ${error.message}`, 100);
            setTimeout(() => this.progressBar.hide(), 3000);
        }
    }

    _getFloatValue(id, defaultValue) {
        const el = this._getElement(id);
        if (!el || el.value === '') return defaultValue !== undefined ? defaultValue : NaN;
        const val = parseFloat(el.value);
        return isNaN(val) ? (defaultValue !== undefined ? defaultValue : NaN) : val;
    }

    checkCondensationWarnings(report) {
        const warnings = [];
        if (!report || !report.stages) return warnings;

        report.stages.forEach(stage => {
            const cond = (stage.condensation || 0) * 3600;
            if (cond > 5) warnings.push({ stage: stage.number, message: `Stage ${stage.number}: High condensation (${cond.toFixed(2)} kg/hr). Consider adjusting intercooler settings.` });
            if (stage.efficiency < 65) warnings.push({ stage: stage.number, message: `Stage ${stage.number}: Low efficiency (${stage.efficiency.toFixed(1)}%). Check for wear or fouling.` });
            if (stage.pressureRatio > 4) warnings.push({ stage: stage.number, message: `Stage ${stage.number}: High pressure ratio (${stage.pressureRatio.toFixed(2)}). Consider adding another stage.` });
        });
        return warnings;
    }

    optimizeEnergyCost() {
        if (!this.report) return;

        const resultsContainer = this._getElement('resultsContainer');
        if (!resultsContainer) return;

        const currentEnergy = this.energyRenderer.render(this.report, resultsContainer);
        const suggestions = [];
        const currentIntercoolerEff = parseFloat(this._getElement('intercoolerEfficiency')?.value) || 0.85;
        const basePower = this.report.summary.totalPower;
        const { hours, tariff, annualCost } = currentEnergy;

        let bestIntercooler = currentIntercoolerEff;
        let bestIntercoolerCost = annualCost;
        [0.75, 0.80, 0.85, 0.90, 0.95].forEach(opt => {
            const improvement = (opt - currentIntercoolerEff) * 0.15;
            const newPower = basePower * (1 - improvement * 0.1);
            const newCost = newPower * hours * tariff;
            if (newCost < bestIntercoolerCost) {
                bestIntercoolerCost = newCost;
                bestIntercooler = opt;
            }
        });

        if (bestIntercooler > currentIntercoolerEff) {
            suggestions.push({
                title: 'Increase Intercooler Efficiency',
                description: `Current: ${(currentIntercoolerEff * 100).toFixed(0)}% → Recommended: ${(bestIntercooler * 100).toFixed(0)}%`,
                savings: (annualCost - bestIntercoolerCost).toFixed(0),
                impact: 'high'
            });
        }

        const stages = this.report.stages;
        const avgEfficiency = stages.reduce((sum, s) => sum + (s.efficiency || 0), 0) / stages.length;
        const lowStages = stages.filter(s => (s.efficiency || 0) < avgEfficiency * 0.9).map(s => s.number);

        if (lowStages.length > 0) {
            suggestions.push({
                title: 'Optimize Underperforming Stages',
                description: `Stage(s) ${lowStages.join(', ')} are below average efficiency. Consider maintenance or adjustment.`,
                savings: '~5-10%',
                impact: 'medium'
            });
        }

        if (stages.some(s => (s.pressureRatio || 0) > 3.5)) {
            suggestions.push({
                title: 'Reduce Stage Pressure Ratios',
                description: 'High pressure ratios (>3.5) reduce efficiency. Consider adding an extra stage.',
                savings: '~8-15%',
                impact: 'high'
            });
        }

        this.showOptimizationResults(suggestions, currentEnergy);
    }

    showOptimizationResults(suggestions, currentEnergy) {
        const container = this._getElement('optimizationContainer');
        if (!container) return;
        
        const impactColors = { high: 'high', medium: 'medium', low: 'low' };

        if (suggestions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">✅</span>
                    <h3>Your System is Well Optimized</h3>
                    <p>No significant improvements identified.</p>
                </div>`;
        } else {
            let html = `
                <div style="margin-bottom:12px;">
                    <p style="color: var(--text-secondary); font-size:13px;">
                        💰 Current Annual Energy Cost: <strong style="color: var(--text-primary);">${currentEnergy.currency} ${currentEnergy.annualCost.toLocaleString()}</strong>
                    </p>
                </div>
                <div class="ai-recommendations">`;

            suggestions.forEach(s => {
                const icon = s.impact === 'high' ? '🔴' : s.impact === 'medium' ? '🟡' : '🔵';
                const savingsText = typeof s.savings === 'string' ? s.savings : `₹${s.savings}`;
                html += `
                    <div class="ai-card ${impactColors[s.impact]}">
                        <div>
                            <span class="ai-icon">${icon}</span>
                            <span class="ai-title">${s.title}</span>
                        </div>
                        <div class="ai-desc">${s.description}</div>
                        <div class="ai-impact">💰 Potential Savings: ${savingsText}</div>
                    </div>`;
            });

            html += '</div>';
            container.innerHTML = html;
        }
        this.progressBar.show('Optimization complete', 100);
        setTimeout(() => this.progressBar.hide(), 2000);
    }

    compareConfigurations() {
        if (!this.report) {
            alert('Please run the simulation first.');
            return;
        }

        const savedReport = JSON.parse(localStorage.getItem('compressor-analyzer-comparison') || 'null');

        if (!savedReport) {
            localStorage.setItem('compressor-analyzer-comparison', JSON.stringify(this.report));
            this.showSaveStatus('Current configuration saved for comparison!', 'success');
            return;
        }

        const current = this.report;
        const container = this._getElement('resultsContainer');
        if (!container) return;

        const metrics = [
            { key: 'totalPower', label: 'Total Power (kW)', unit: ' kW', lower: true },
            { key: 'overallEfficiency', label: 'Efficiency (%)', unit: '%', lower: false },
            { key: 'totalCondensation', label: 'Condensation (kg/hr)', unit: ' kg/hr', lower: true },
            { key: 'FAD', label: 'Free Air Delivery (m³/hr)', unit: ' m³/hr', lower: false },
            { key: 'totalHead', label: 'Total Head (kJ/kg)', unit: ' kJ/kg', lower: false }
        ];

        let html = `
            <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border-color);">
                <h4 style="color: var(--text-secondary); font-size:13px; margin-bottom:12px;">📊 Configuration Comparison</h4>
                <div class="comparison-grid">
                    <div class="comparison-card">
                        <div class="comp-title">Current Configuration</div>`;

        metrics.forEach(m => {
            const val = current.summary[m.key] || 0;
            html += `
                <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid var(--border-color);">
                    <span style="font-size:12px; color:var(--text-muted);">${m.label}</span>
                    <span style="font-size:14px; font-weight:600;">${Utils.format(val, m.key === 'overallEfficiency' ? 1 : 2)}${m.unit}</span>
                </div>`;
        });

        html += `
            </div>
            <div class="comparison-card highlight">
                <div class="comp-title">Saved Configuration ${savedReport.timestamp ? new Date(savedReport.timestamp).toLocaleDateString() : ''}</div>`;

        metrics.forEach(m => {
            const currentVal = current.summary[m.key] || 0;
            const savedVal = savedReport.summary[m.key] || 0;
            const isBetter = m.lower ? savedVal < currentVal : savedVal > currentVal;
            const diff = ((savedVal - currentVal) / (currentVal || 1) * 100);
            const diffText = Math.abs(diff) > 1 ? ` (${diff > 0 ? '+' : ''}${diff.toFixed(1)}%)` : '';
            html += `
                <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid var(--border-color);">
                    <span style="font-size:12px; color:var(--text-muted);">${m.label}</span>
                    <span style="font-size:14px; font-weight:600; color:${isBetter ? 'var(--color-green)' : 'var(--color-red)'}">
                        ${Utils.format(savedVal, m.key === 'overallEfficiency' ? 1 : 2)}${m.unit}${diffText}
                    </span>
                </div>`;
        });

        html += `
                </div>
            </div>
            <div style="margin-top:8px; font-size:11px; color:var(--text-muted); text-align:center;">
                ${current.summary.overallEfficiency > savedReport.summary.overallEfficiency ? '✅ Current configuration is better' :
                  current.summary.overallEfficiency < savedReport.summary.overallEfficiency ? '⚠️ Saved configuration is better' :
                  '⚖️ Both configurations are equal'}
            </div>
        </div>`;

        container.insertAdjacentHTML('beforeend', html);
        localStorage.setItem('compressor-analyzer-comparison', JSON.stringify(this.report));
        this.showSaveStatus('Comparison updated!', 'success');
    }

    saveProject() {
        try {
            const data = {
                inputs: {
                    humidity: this._getElement('humidity')?.value || '',
                    pressure: this._getElement('pressure')?.value || '',
                    temperature: this._getElement('temperature')?.value || '',
                    airFlow: this._getElement('airFlow')?.value || '',
                    stageCount: this._getElement('stageCount')?.value || '',
                    intercoolerEfficiency: this._getElement('intercoolerEfficiency')?.value || '',
                    compressionType: this._getElement('compressionType')?.value || '',
                    mechEfficiency: this._getElement('mechEfficiency')?.value || '',
                    motorEfficiency: this._getElement('motorEfficiency')?.value || '',
                    pressureLoss: this._getElement('pressureLoss')?.value || '',
                    operatingHours: this._getElement('operatingHours')?.value || '',
                    electricityTariff: this._getElement('electricityTariff')?.value || '',
                    currency: this._getElement('currency')?.value || ''
                },
                stages: []
            };

            const stageCountEl = this._getElement('stageCount');
            const count = Math.min(20, Math.max(1, stageCountEl ? (parseInt(stageCountEl.value) || 5) : 5));
            for (let i = 1; i <= count; i++) {
                data.stages.push({
                    pin: this._getElement('pin' + i)?.value || '',
                    pout: this._getElement('pout' + i)?.value || '',
                    tin: this._getElement('tin' + i)?.value || '',
                    tout: this._getElement('tout' + i)?.value || '',
                    stageEff: this._getElement('stageEff' + i)?.value || ''
                });
            }

            const jsonString = JSON.stringify(data);
            const base64String = btoa(
                encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (_, p1) => 
                    String.fromCharCode('0x' + p1)
                )
            );
            
            const checksum = this.calculateChecksum(jsonString);
            this.showSaveCodeModal(base64String + '|' + checksum);
        } catch (e) {
            this.showSaveStatus('Error saving project: ' + e.message, 'error');
        }
    }

    calculateChecksum(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    loadProject() {
        this.showLoadCodeModal();
    }

    loadProjectFromCode(code) {
        try {
            const cleanCode = code.trim().replace(/\s/g, '');
            const parts = cleanCode.split('|');

            if (parts.length !== 2) {
                this.showSaveStatus('Invalid project code format.', 'error');
                return;
            }

            const jsonString = decodeURIComponent(
                Array.from(atob(parts[0]), c => 
                    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                ).join('')
            );
            
            const calculatedChecksum = this.calculateChecksum(jsonString);

            if (calculatedChecksum !== parts[1]) {
                this.showSaveStatus('Project code is corrupted or invalid.', 'error');
                return;
            }

            const data = JSON.parse(jsonString);

            Object.keys(data.inputs).forEach(key => {
                const el = this._getElement(key);
                if (el) el.value = data.inputs[key];
            });

            this.generateStages();

            setTimeout(() => {
                data.stages.forEach((stage, j) => {
                    const num = j + 1;
                    this._setValue('pin' + num, stage.pin);
                    this._setValue('pout' + num, stage.pout);
                    this._setValue('tin' + num, stage.tin);
                    this._setValue('tout' + num, stage.tout);
                    this._setValue('stageEff' + num, stage.stageEff || '0.85');
                });
                this.showSaveStatus('Project loaded successfully!', 'success');
                this.closeModals();
            }, 200);

        } catch (e) {
            this.showSaveStatus('Error loading project: ' + e.message, 'error');
        }
    }

    showSaveCodeModal(code) {
        this.closeModals();

        const modal = document.createElement('div');
        modal.id = 'saveCodeModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;';

        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: 16px; padding: 30px; max-width: 700px; width: 100%; border: 1px solid var(--border-color); box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h2 style="color: var(--text-primary); font-size:18px;">💾 Project Save Code</h2>
                    <button id="closeSaveModal" style="background:none;border:none;color:var(--text-secondary);font-size:24px;cursor:pointer;">✕</button>
                </div>
                <p style="color: var(--text-secondary); font-size:13px; margin-bottom:12px;">Copy the code below and save it anywhere. To load this project, click "Load Project" and paste this code.</p>
                <div style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 16px; position: relative;">
                    <code id="projectCodeDisplay" style="color: var(--text-primary); font-family: 'Courier New', monospace; font-size: 12px; word-break: break-all; line-height: 1.6; display: block; max-height: 200px; overflow-y: auto; user-select: all;">${code}</code>
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button id="copyProjectBtn" class="btn primary" style="flex:1;">📋 Copy to Clipboard</button>
                    <button id="closeSaveModalBtn" class="btn secondary" style="flex:1;">Close</button>
                </div>
                <div style="margin-top:12px; padding:10px; background: rgba(34,197,94,0.1); border-radius:6px; border:1px solid rgba(34,197,94,0.2);">
                    <p style="color: var(--color-green); font-size:12px;">Keep this code safe! You'll need it to load your project later.</p>
                </div>
                <div style="margin-top:8px; padding:8px; background: rgba(245,158,11,0.1); border-radius:6px; border:1px solid rgba(245,158,11,0.2);">
                    <p style="color: var(--color-orange); font-size:11px;">Select the code above, right-click and choose "Copy", or use Ctrl+C.</p>
                </div>
            </div>`;

        document.body.appendChild(modal);

        this._addModalListener('closeSaveModal', 'click', () => this.closeModals());
        this._addModalListener('closeSaveModalBtn', 'click', () => this.closeModals());
        this._addModalListener('copyProjectBtn', 'click', () => {
            const codeElement = this._getElement('projectCodeDisplay');
            if (!codeElement) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(codeElement.textContent)
                    .then(() => this.showCopyStatus('Copied to clipboard!'))
                    .catch(() => this._fallbackCopy(codeElement));
            } else {
                this._fallbackCopy(codeElement);
            }
        });
    }

    showLoadCodeModal() {
        this.closeModals();

        const modal = document.createElement('div');
        modal.id = 'loadCodeModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;';

        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: 16px; padding: 30px; max-width: 600px; width: 100%; border: 1px solid var(--border-color); box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h2 style="color: var(--text-primary); font-size:18px;">📂 Load Project</h2>
                    <button id="closeLoadModal" style="background:none;border:none;color:var(--text-secondary);font-size:24px;cursor:pointer;">✕</button>
                </div>
                <p style="color: var(--text-secondary); font-size:13px; margin-bottom:12px;">Paste the project code you saved earlier to restore all your data.</p>
                <div style="margin-bottom:16px;">
                    <label style="color: var(--text-secondary); font-size:12px; display:block; margin-bottom:4px;">Enter Project Code:</label>
                    <textarea id="projectCodeInput" style="width: 100%; padding: 12px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-family: 'Courier New', monospace; font-size: 13px; resize: vertical; min-height: 100px;" placeholder="Paste your project code here..."></textarea>
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button id="loadProjectBtn2" class="btn success" style="flex:1;">🔄 Load Project</button>
                    <button id="closeLoadModalBtn" class="btn secondary" style="flex:1;">Cancel</button>
                </div>
                <div style="margin-top:12px; padding:10px; background: rgba(245,158,11,0.1); border-radius:6px; border:1px solid rgba(245,158,11,0.2);">
                    <p style="color: var(--color-orange); font-size:12px;">Make sure you paste the complete code including the checksum after the "|" symbol.</p>
                </div>
            </div>`;

        document.body.appendChild(modal);

        const self = this;
        this._addModalListener('closeLoadModal', 'click', () => self.closeModals());
        this._addModalListener('closeLoadModalBtn', 'click', () => self.closeModals());
        this._addModalListener('loadProjectBtn2', 'click', () => {
            const codeInput = self._getElement('projectCodeInput');
            if (codeInput) {
                self.loadProjectFromCode(codeInput.value);
            }
        });
    }

    _addModalListener(id, event, handler) {
        const el = this._getElement(id);
        if (el) {
            el.addEventListener(event, handler);
        }
    }

    _fallbackCopy(element) {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        try {
            document.execCommand('copy');
            this.showCopyStatus('Copied to clipboard!');
        } catch (e) {
            this.showCopyStatus('Please copy the text manually (Ctrl+C)');
        }
        selection.removeAllRanges();
    }

    showCopyStatus(message) {
        const toast = document.createElement('div');
        toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: var(--bg-card); color: var(--text-primary); padding: 12px 24px; border-radius: 8px; border: 1px solid var(--color-green); box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 99999; font-size: 14px; font-family: var(--font);';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    closeModals() {
        document.querySelectorAll('#saveCodeModal, #loadCodeModal').forEach(m => m.remove());
    }

    exportPDF() {
        if (!this.report) {
            alert('Please run the simulation first.');
            return;
        }

        if (typeof html2canvas === 'undefined') {
            alert('html2canvas library is not loaded. PDF export requires this library.');
            return;
        }
        const jsPDF = window.jspdf ? window.jspdf.jsPDF : (window.jsPDF || null);
        if (!jsPDF) {
            alert('jsPDF library is not loaded. PDF export requires this library.');
            return;
        }

        try {
            this.progressBar.show('Generating PDF with charts...', 0);

            const pdfContent = document.createElement('div');
            pdfContent.style.cssText = 'padding: 40px; background: white; color: black; font-family: Arial, sans-serif; width: 800px; max-width: 800px;';

            const r = this.report;
            let htmlContent = `
                <h1 style="text-align:center; color:#1a2332; font-size:24px; margin-bottom:5px;">Compressor Performance Analysis Report</h1>
                <p style="text-align:center; color:#666; font-size:14px;">Generated: ${new Date().toLocaleString()}</p>
                <hr style="margin:20px 0; border-color:#ddd;">

                <h2 style="font-size:16px; color:#1a2332;">Input Parameters</h2>
                <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Humidity</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${r.input.humidity}%</td></tr>
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Pressure</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${r.input.pressure} bar</td></tr>
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Temperature</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${r.input.temperature}°C</td></tr>
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Air Flow</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${r.input.airFlow} kg/hr</td></tr>
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Stages</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${r.input.stageCount}</td></tr>
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Compression Type</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${r.input.compressionType}</td></tr>
                </table>

                <h2 style="font-size:16px; color:#1a2332; margin-top:15px;">Performance Summary</h2>
                <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Total Power</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${Utils.format(r.summary.totalPower, 2)} kW</td></tr>
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Overall Efficiency</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${Utils.format(r.summary.overallEfficiency, 1)}%</td></tr>
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Total Condensation</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${Utils.format(r.summary.totalCondensation * 3600, 2)} kg/hr</td></tr>
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Free Air Delivery</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${Utils.format(r.summary.FAD * 3600, 2)} m³/hr</td></tr>
                </table>

                <h2 style="font-size:16px; color:#1a2332; margin-top:15px;">Stage Results</h2>
                <table style="width:100%; border-collapse:collapse; font-size:10px; margin:10px 0;">
                    <thead><tr style="background:#f0f0f0;">
                        <th style="padding:4px 8px; border:1px solid #ddd;">Stage</th>
                        <th style="padding:4px 8px; border:1px solid #ddd;">PR</th>
                        <th style="padding:4px 8px; border:1px solid #ddd;">TR</th>
                        <th style="padding:4px 8px; border:1px solid #ddd;">n</th>
                        <th style="padding:4px 8px; border:1px solid #ddd;">η_poly%</th>
                        <th style="padding:4px 8px; border:1px solid #ddd;">Power(kW)</th>
                        <th style="padding:4px 8px; border:1px solid #ddd;">Head(kJ/kg)</th>
                        <th style="padding:4px 8px; border:1px solid #ddd;">Cond(kg/hr)</th>
                    </tr></thead><tbody>`;

            r.stages.forEach(s => {
                htmlContent += `
                    <tr>
                        <td style="padding:4px 8px; border:1px solid #ddd; text-align:center;">${s.number}</td>
                        <td style="padding:4px 8px; border:1px solid #ddd; text-align:center;">${Utils.format(s.pressureRatio, 3)}</td>
                        <td style="padding:4px 8px; border:1px solid #ddd; text-align:center;">${Utils.format(s.temperatureRatio, 3)}</td>
                        <td style="padding:4px 8px; border:1px solid #ddd; text-align:center;">${Utils.format(s.polytropicIndex, 3)}</td>
                        <td style="padding:4px 8px; border:1px solid #ddd; text-align:center;">${Utils.format(s.efficiency, 1)}</td>
                        <td style="padding:4px 8px; border:1px solid #ddd; text-align:center;">${Utils.format(s.power, 2)}</td>
                        <td style="padding:4px 8px; border:1px solid #ddd; text-align:center;">${Utils.format(s.head, 2)}</td>
                        <td style="padding:4px 8px; border:1px solid #ddd; text-align:center;">${Utils.format((s.condensation || 0) * 3600, 2)}</td>
                    </tr>`;
            });

            htmlContent += '</tbody></table>';

            const resultsContainer = this._getElement('resultsContainer');
            const energy = resultsContainer ? this.energyRenderer.render(r, resultsContainer) : { annualEnergy: 0, annualCost: 0, currency: '₹' };
            const annualCO2 = energy.annualEnergy * 0.82 / 1000;

            htmlContent += `
                <h2 style="font-size:16px; color:#1a2332; margin-top:15px;">Energy & Carbon Analysis</h2>
                <table style="width:100%; border-collapse:collapse; font-size:12px; margin:10px 0;">
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Annual Energy Consumption</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${energy.annualEnergy.toLocaleString()} kWh</td></tr>
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Annual Energy Cost</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${energy.currency} ${energy.annualCost.toLocaleString()}</td></tr>
                    <tr><td style="padding:4px 8px; border-bottom:1px solid #eee;"><strong>Annual CO₂ Emissions</strong></td><td style="padding:4px 8px; border-bottom:1px solid #eee;">${annualCO2.toFixed(1)} tons</td></tr>
                </table>`;

            this.progressBar.show('Capturing charts...', 60);

            const chartIds = ['pressureChart', 'efficiencyChart', 'powerChart'];
            const chartImages = chartIds.map(id => {
                const canvas = this._getElement(id);
                return canvas ? { id, data: canvas.toDataURL('image/png', 0.8) } : null;
            }).filter(Boolean);

            if (chartImages.length > 0) {
                htmlContent += '<h2 style="font-size:16px; color:#1a2332; margin-top:15px;">Performance Charts</h2>';
                htmlContent += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">';

                chartImages.forEach(img => {
                    const label = img.id === 'pressureChart' ? 'Pressure Ratio' :
                                  img.id === 'efficiencyChart' ? 'Efficiency' : 'Power Distribution';
                    htmlContent += `
                        <div style="border:1px solid #ddd; padding:6px; border-radius:4px;">
                            <p style="text-align:center; font-size:11px; color:#555; margin-bottom:4px;"><strong>${label}</strong></p>
                            <img src="${img.data}" style="width:100%; height:auto; max-height:150px; object-fit:contain;">
                        </div>`;
                });

                htmlContent += '</div>';
            }

            htmlContent += `
                <div style="margin-top:20px; padding:12px; background:#f5f5f5; border-radius:6px; font-size:11px; color:#555;">
                    <strong style="color:#333;">Engineering Notes</strong>
                    <ul style="margin:5px 0 0 20px;">
                        <li>All calculations use SI units internally</li>
                        <li>Reference: ASME PTC 10 - Centrifugal Compressors</li>
                        <li>Saturation pressure: Tetens equation (-40°C to 50°C)</li>
                        <li>Compression type: ${r.input.compressionType}</li>
                        <li>Free Air Delivery at standard conditions (15°C, 1.013 bar)</li>
                        <li>Clearance factor: ${Utils.format(THERMO.COMPRESSOR.CLEARANCE_FACTOR * 100, 1)}%</li>
                    </ul>
                </div>
                <hr style="margin:30px 0 10px 0; border-color:#ddd;">
                <p style="text-align:center; color:#999; font-size:10px;">Compressor Performance Analyzer — Engineering Analysis Tool</p>`;

            pdfContent.innerHTML = htmlContent;
            this.progressBar.show('Generating PDF...', 80);

            document.body.appendChild(pdfContent);
            html2canvas(pdfContent, {
                scale: 2,
                useCORS: true,
                logging: false,
                width: 800,
                height: pdfContent.scrollHeight
            }).then(canvas => {
                document.body.removeChild(pdfContent);
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = 210;
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`compressor_report_${new Date().toISOString().slice(0, 10)}.pdf`);
                this.progressBar.hide();
            }).catch(error => {
                this.progressBar.show('Error generating PDF', 100);
                setTimeout(() => this.progressBar.hide(), 2000);
            });

        } catch (error) {
            this.progressBar.show('Error generating PDF', 100);
            setTimeout(() => this.progressBar.hide(), 2000);
        }
    }

    exportCSV() {
        if (!this.report) {
            alert('Please run the simulation first.');
            return;
        }

        const r = this.report;
        let csv = 'Stage,Pressure Ratio,Temperature Ratio,Polytropic Index,Efficiency (%),Power (kW),Condensation (kg/hr),Moisture (kg/hr)\n';

        r.stages.forEach(s => {
            csv += `${s.number},${Utils.format(s.pressureRatio, 3)},${Utils.format(s.temperatureRatio, 3)},${Utils.format(s.polytropicIndex, 3)},${Utils.format(s.efficiency, 2)},${Utils.format(s.power, 2)},${Utils.format((s.condensation || 0) * 3600, 2)},${Utils.format((s.remainingMoisture || 0) * 3600, 2)}\n`;
        });

        csv += '\nSummary\n';
        csv += `Total Power (kW),${Utils.format(r.summary.totalPower, 2)}\n`;
        csv += `Total Condensation (kg/hr),${Utils.format(r.summary.totalCondensation * 3600, 2)}\n`;
        csv += `Overall Efficiency (%),${Utils.format(r.summary.overallEfficiency, 2)}\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `compressor_results_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    exportReport() {
        if (!this.report) {
            alert('Please run the simulation first.');
            return;
        }

        const r = this.report;
        const finalFlow = r.stages.length > 0 ? (r.stages[r.stages.length - 1].remainingMoisture || r.input.airFlow / 3600) * 3600 : r.input.airFlow;

        let text = `${'='.repeat(80)}\n`;
        text += `Compressor Performance Analysis Report\n`;
        text += `Generated: ${new Date(r.timestamp).toLocaleString()}\n`;
        text += `${'='.repeat(80)}\n\n`;
        text += `INPUT PARAMETERS\n${'-'.repeat(80)}\n`;
        text += `Humidity: ${r.input.humidity}%\nPressure: ${r.input.pressure} bar\nTemperature: ${r.input.temperature}°C\nAir Flow: ${r.input.airFlow} kg/hr\nStages: ${r.input.stageCount}\nk: ${r.input.k}\nIntercooler Efficiency: ${Utils.format(r.input.intercoolerEff * 100, 1)}%\nIntercooler Pressure Loss: ${Utils.format(r.input.pressureLoss, 3)} bar\nCompression Type: ${r.input.compressionType}\n\n`;
        text += `SUMMARY\n${'-'.repeat(80)}\n`;
        text += `Total Power: ${Utils.format(r.summary.totalPower, 2)} kW\n`;
        text += `Shaft Power: ${Utils.format(r.summary.shaftPower, 2)} kW\n`;
        text += `Motor Power: ${Utils.format(r.summary.motorPower, 2)} kW\n`;
        text += `Overall Efficiency: ${Utils.format(r.summary.overallEfficiency, 1)}%\n`;
        text += `Total Condensation: ${Utils.format(r.summary.totalCondensation * 3600, 2)} kg/hr\n`;
        text += `Free Air Delivery: ${Utils.format(r.summary.FAD * 3600, 2)} m³/hr\n`;
        text += `Final Air Flow: ${Utils.format(finalFlow, 2)} kg/hr\n`;

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `compressor_report_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    exportCharts() {
        const chartIds = ['pressureChart', 'temperatureChart', 'powerChart', 'efficiencyChart', 'humidityChart', 'condensationChart', 'pvChart', 'tsChart', 'compressorMapChart'];
        chartIds.forEach(id => {
            const canvas = this._getElement(id);
            if (canvas) {
                const link = document.createElement('a');
                link.download = id + '.png';
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
            }
        });
    }

    clearResults() {
        const resultsContainer = this._getElement('resultsContainer');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">🔬</span><h3>No Results</h3><p>Run the simulation to see results</p></div>';
        }
        const optimizationSection = this._getElement('optimization');
        if (optimizationSection) optimizationSection.style.display = 'none';
        const optimizationContainer = this._getElement('optimizationContainer');
        if (optimizationContainer) {
            optimizationContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">🤖</span><h3>Run Simulation First</h3><p>AI recommendations will appear after simulation</p></div>';
        }
        this.charts.destroyAll();
        this.charts.showEmptyState();
        this.progressBar.hide();
        this.report = null;
    }

    showSaveStatus(message, type) {
        let status = this._getElement('saveStatus');
        if (!status) {
            status = document.createElement('div');
            status.id = 'saveStatus';
            status.className = 'save-status';
            const actionBar = document.querySelector('.action-bar');
            if (actionBar) actionBar.appendChild(status);
        }
        status.textContent = message;
        status.className = `save-status show ${type}`;
        setTimeout(() => status.classList.remove('show'), 3000);
    }
}