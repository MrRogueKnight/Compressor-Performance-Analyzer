/**
 * Results Renderer - renders simulation results table
 */
import { Utils } from '../utils/utils.js';
import { Renderer } from './Renderer.js';

export class ResultsRenderer {
    constructor(controller) {
        this.controller = controller;
    }

    render(report, compressor) {
        const container = document.getElementById('resultsContainer');
        const r = report;
        if (!r || !r.stages || r.stages.length === 0) {
            Renderer.showEmpty('resultsContainer', '🔬', 'No Results', 'Run the simulation to see results');
            return;
        }

        const finalFlow = r.stages.length > 0 ? (r.stages[r.stages.length - 1].remainingMoisture || r.input.airFlow / 3600) * 3600 : r.input.airFlow;

        let html = '<div class="kpi-grid" style="margin-bottom:14px;">';
        html += '<div class="kpi-item"><span class="kpi-label">Total Power</span><span class="kpi-value green">' + Utils.format(r.summary.totalPower, 2) + ' kW</span></div>';
        html += '<div class="kpi-item"><span class="kpi-label">Shaft Power</span><span class="kpi-value blue">' + Utils.format(r.summary.shaftPower, 2) + ' kW</span></div>';
        html += '<div class="kpi-item"><span class="kpi-label">Motor Power</span><span class="kpi-value purple">' + Utils.format(r.summary.motorPower, 2) + ' kW</span></div>';
        html += '<div class="kpi-item"><span class="kpi-label">Overall Efficiency</span><span class="kpi-value orange">' + Utils.format(r.summary.overallEfficiency, 1) + '%</span></div>';
        html += '<div class="kpi-item"><span class="kpi-label">Total Condensation</span><span class="kpi-value cyan">' + Utils.format(r.summary.totalCondensation * 3600, 2) + ' kg/hr</span></div>';
        html += '<div class="kpi-item"><span class="kpi-label">Free Air Delivery</span><span class="kpi-value pink">' + Utils.format(r.summary.FAD * 3600, 2) + ' m³/hr</span></div>';
        html += '<div class="kpi-item"><span class="kpi-label">Total Head</span><span class="kpi-value indigo">' + Utils.format(r.summary.totalHead, 2) + ' kJ/kg</span></div>';
        html += '<div class="kpi-item"><span class="kpi-label">Final Air Flow</span><span class="kpi-value">' + Utils.format(finalFlow, 2) + ' kg/hr</span></div>';
        html += '</div>';

        html += '<div class="table-wrap"><table class="results-table"><thead><tr>';
        html += '<th>Stage</th><th>PR</th><th>TR</th><th>n</th><th>η_poly (%)</th><th>η_vol (%)</th><th>Power (kW)</th><th>Head (kJ/kg)</th><th>Cond (kg/hr)</th><th>Moist (kg/hr)</th>';
        html += '</tr></thead><tbody>';

        r.stages.forEach(s => {
            const effWarning = s.efficiency < 70 ? 'warning' : '';
            html += '<tr>';
            html += '<td class="stage-num">' + s.number + '</td>';
            html += '<td>' + Utils.format(s.pressureRatio, 3) + '</td>';
            html += '<td>' + Utils.format(s.temperatureRatio, 3) + '</td>';
            html += '<td>' + Utils.format(s.polytropicIndex, 3) + '</td>';
            html += '<td class="' + effWarning + '">' + Utils.format(s.efficiency, 1) + '</td>';
            html += '<td>' + Utils.format(s.volumetricEfficiency * 100, 1) + '</td>';
            html += '<td>' + Utils.format(s.power, 2) + '</td>';
            html += '<td>' + Utils.format(s.head, 2) + '</td>';
            html += '<td>' + Utils.format((s.condensation || 0) * 3600, 2) + '</td>';
            html += '<td>' + Utils.format((s.remainingMoisture || 0) * 3600, 2) + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        html += '<div class="engineering-notes"><p>📝 Engineering Notes</p><ul>';
        html += '<li>All calculations use SI units internally</li>';
        html += '<li>Reference: ASME PTC 10 - Centrifugal Compressors</li>';
        html += '<li>Saturation pressure: Tetens equation (-40°C to 50°C)</li>';
        html += '<li>Intercooler efficiency: ' + Utils.format(compressor.atmosphere.intercoolerEff * 100, 1) + '%</li>';
        html += '<li>Intercooler pressure loss: ' + Utils.format(compressor.atmosphere.pressureLoss, 3) + ' bar</li>';
        html += '<li>Compression type: ' + document.getElementById('compressionType').value + '</li>';
        html += '<li>Mechanical efficiency: ' + Utils.format(parseFloat(document.getElementById('mechEfficiency').value) * 100, 1) + '%</li>';
        html += '<li>Motor efficiency: ' + Utils.format(parseFloat(document.getElementById('motorEfficiency').value) * 100, 1) + '%</li>';
        html += '<li>Free Air Delivery at standard conditions (15°C, 1.013 bar)</li>';
        html += '<li>Clearance factor: ' + Utils.format(0.05 * 100, 1) + '%</li>';
        html += '<li>Typical compressor efficiency range: 70-92%</li>';
        html += '</ul></div>';

        container.innerHTML = html;
    }
}