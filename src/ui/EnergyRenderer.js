/**
 * Energy Cost Renderer
 */
export class EnergyRenderer {
    render(report, resultsContainer) {
        const hours = parseFloat(document.getElementById('operatingHours').value) || 8000;
        const tariff = parseFloat(document.getElementById('electricityTariff').value) || 7.5;
        const currency = document.getElementById('currency').value;
        const totalPower = report.summary.totalPower || 0;
        const annualEnergy = totalPower * hours;
        const annualCost = annualEnergy * tariff;

        const html = `
            <div class="energy-cost-grid" style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border-color);">
                <div class="energy-cost-item">
                    <span class="energy-label">Annual Operating Hours</span>
                    <span class="energy-value">${hours.toLocaleString()} hrs</span>
                </div>
                <div class="energy-cost-item">
                    <span class="energy-label">Electricity Tariff</span>
                    <span class="energy-value">${currency} ${tariff.toFixed(2)}/kWh</span>
                </div>
                <div class="energy-cost-item">
                    <span class="energy-label">Annual Energy Consumption</span>
                    <span class="energy-value blue">${annualEnergy.toLocaleString()} kWh</span>
                </div>
                <div class="energy-cost-item">
                    <span class="energy-label">Annual Energy Cost</span>
                    <span class="energy-value green">${currency} ${annualCost.toLocaleString()}</span>
                </div>
            </div>
        `;

        const kpiGrid = resultsContainer.querySelector('.kpi-grid');
        if (kpiGrid) {
            kpiGrid.insertAdjacentHTML('afterend', html);
        } else {
            resultsContainer.insertAdjacentHTML('beforeend', html);
        }

        return { hours, tariff, currency, annualEnergy, annualCost, totalPower };
    }
}