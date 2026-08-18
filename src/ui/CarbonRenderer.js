/**
 * Carbon Footprint Renderer
 */
export class CarbonRenderer {
    render(report, energyData, resultsContainer) {
        const emissionFactor = 0.82;
        const annualCO2 = energyData.annualEnergy * emissionFactor / 1000;

        const benchmarks = {
            excellent: 50,
            good: 100,
            average: 150,
            poor: 200
        };

        let rating = 'average';
        if (annualCO2 < benchmarks.excellent) rating = 'excellent';
        else if (annualCO2 < benchmarks.good) rating = 'good';
        else if (annualCO2 < benchmarks.average) rating = 'average';
        else rating = 'poor';

        const treesEquivalent = Math.round(annualCO2 * 1000 / 21);
        const ratingColors = { excellent: 'green', good: 'green', average: 'orange', poor: 'red' };

        const html = `
            <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border-color);">
                <h4 style="color: var(--text-secondary); font-size:13px; margin-bottom:8px;">🌍 Carbon Footprint Analysis</h4>
                <div class="carbon-grid">
                    <div class="carbon-item">
                        <span class="carbon-label">Annual CO₂ Emissions</span>
                        <span class="carbon-value ${ratingColors[rating]}">${annualCO2.toFixed(1)} tons</span>
                    </div>
                    <div class="carbon-item">
                        <span class="carbon-label">Emission Factor</span>
                        <span class="carbon-value">${emissionFactor} kg CO₂/kWh</span>
                    </div>
                    <div class="carbon-item">
                        <span class="carbon-label">Efficiency Rating</span>
                        <span class="carbon-value ${ratingColors[rating]}">${rating.toUpperCase()}</span>
                    </div>
                    <div class="carbon-item">
                        <span class="carbon-label">Trees Needed to Offset</span>
                        <span class="carbon-value green">${treesEquivalent} trees</span>
                    </div>
                </div>
                <div style="margin-top:8px; padding:8px 12px; background: var(--bg-input); border-radius:6px; font-size:11px; color: var(--text-muted);">
                    <strong>Industry Benchmark:</strong> 
                    Excellent: &lt;50 tons/yr | Good: 50-100 tons/yr | Average: 100-150 tons/yr | Poor: &gt;150 tons/yr
                </div>
            </div>
        `;

        const kpiGrid = resultsContainer.querySelector('.kpi-grid');
        if (kpiGrid) {
            kpiGrid.insertAdjacentHTML('afterend', html);
        } else {
            resultsContainer.insertAdjacentHTML('beforeend', html);
        }
    }
}