/**
 * Input Validation Functions
 */
export function validateField(value, min, max) {
    return !isNaN(value) && value >= min && value <= max;
}

export function validateStagePressures(pin, pout) {
    return pin > 0 && pout > 0 && pout > pin;
}

export function validateStageTemperatures(tin, tout) {
    return tout > tin;
}

export function validateEfficiency(value) {
    return value > 0 && value <= 1;
}