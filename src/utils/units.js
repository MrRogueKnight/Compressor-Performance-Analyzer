/**
 * Unit Conversion Functions
 */
import { THERMO } from '../constants/thermo.js';

export const Units = {
    barToKPa: function(bar) { return bar * THERMO.UNITS.BAR_TO_KPA; },
    kPaToBar: function(kPa) { return kPa / THERMO.UNITS.BAR_TO_KPA; },
    celsiusToKelvin: function(c) { return c + 273.15; },
    kelvinToCelsius: function(k) { return k - 273.15; },
    kgHrToKgSec: function(kgHr) { return kgHr / THERMO.UNITS.HR_TO_SEC; },
    kgSecToKgHr: function(kgSec) { return kgSec * THERMO.UNITS.HR_TO_SEC; }
};