/**
 * Atmospheric Properties Renderer
 */
import { Utils } from '../utils/utils.js';

export class AtmosphericRenderer {
    render(compressor) {
        const atm = compressor.atmosphere;
        const s = compressor.initialState;
        document.getElementById('displayHumidity').textContent = atm.humidity + '%';
        document.getElementById('displayPressure').textContent = atm.pressure + ' bar';
        document.getElementById('displayTemperature').textContent = atm.temperature + '°C';
        document.getElementById('displayAirFlow').textContent = atm.airFlow + ' kg/hr';

        if (s) {
            document.getElementById('displaySatPressure').textContent = Utils.format(s.saturationPressure, 4) + ' kPa';
            document.getElementById('displayVaporPressure').textContent = Utils.format(s.vaporPressure, 4) + ' kPa';
            document.getElementById('displayHumidityRatio').textContent = Utils.format(s.humidityRatio, 6) + ' kg/kg';
            document.getElementById('displayMoleFraction').textContent = Utils.format(s.moleFraction, 6);
            document.getElementById('displayDensity').textContent = Utils.format(s.density, 4) + ' kg/m³';
            document.getElementById('displaySpecificVolume').textContent = Utils.format(s.specificVolume, 4) + ' m³/kg';
            document.getElementById('displayDewPoint').textContent = Utils.format(s.dewPoint - 273.15, 1) + '°C';
            document.getElementById('displayWetBulb').textContent = Utils.format(s.wetBulb - 273.15, 1) + '°C';
            document.getElementById('displayAbsoluteHumidity').textContent = Utils.format(s.absoluteHumidity * 1000, 2) + ' g/m³';
            document.getElementById('displayEnthalpy').textContent = Utils.format(s.enthalpy, 2) + ' kJ/kg';
        }
    }
}