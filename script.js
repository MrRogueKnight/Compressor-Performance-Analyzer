/**
 * ============================================================
 * COMPRESSOR PERFORMANCE ANALYZER - Entry Point
 * Loads the modular application
 * ============================================================
 */
import { Controller } from './src/controllers/Controller.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = new Controller();
    // Make app available for debugging only in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.__app = app;
    }
});