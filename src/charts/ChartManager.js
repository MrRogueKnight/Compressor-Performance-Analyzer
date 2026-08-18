/**
 * Chart Manager - Initializes and manages all chart instances
 * Optimized: Removed duplicate chart creation logic, unified approach
 */
import { Utils } from '../utils/utils.js';

export class ChartManager {
    constructor() {
        this.charts = {};
        this.colors = {
            pressure: '#3b82f6',
            temperature: '#f59e0b',
            power: '#22c55e',
            efficiency: '#8b5cf6',
            humidity: '#06b6d4',
            condensation: '#ec4899'
        };
        this.palette = ['#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899', '#06b6d4'];
        this.initialized = false;
        this._chartCache = {};
    }

    initialize(report) {
        this.destroyAll();

        if (!report || !report.stages || report.stages.length === 0) {
            this.showEmptyState();
            return;
        }

        const stages = report.stages;
        const labels = stages.map(s => "Stage " + s.number);
        const c = this.colors;

        // All bar charts configuration
        const barCharts = [
            { id: 'pressureChart', title: 'Pressure Ratio', data: stages.map(s => s.pressureRatio || 0), color: c.pressure, unit: '', label: 'Pressure Ratio' },
            { id: 'temperatureChart', title: 'Temperature Ratio', data: stages.map(s => s.temperatureRatio || 0), color: c.temperature, unit: '', label: 'Temperature Ratio' },
            { id: 'powerChart', title: 'Stage Power', data: stages.map(s => s.power || 0), color: c.power, unit: ' kW', label: 'Power (kW)' },
            { id: 'efficiencyChart', title: 'Stage Efficiency', data: stages.map(s => s.efficiency || 0), color: c.efficiency, unit: '%', label: 'Efficiency (%)' },
            { id: 'humidityChart', title: 'Moisture Flow', data: stages.map(s => (s.remainingMoisture || 0) * 3600), color: c.humidity, unit: ' kg/hr', label: 'Moisture (kg/hr)' },
            { id: 'condensationChart', title: 'Condensation', data: stages.map(s => (s.condensation || 0) * 3600), color: c.condensation, unit: ' kg/hr', label: 'Condensation (kg/hr)' }
        ];

        // Create all bar charts
        barCharts.forEach(cfg => this.createBarChart(cfg.id, cfg.title, labels, cfg.data, cfg.color, cfg.unit, cfg.label));

        // Create specialized charts
        this.createPVDiagram(report);
        this.createTSDiagram(report);
        this.createCompressorMap(report);

        this.initialized = true;
    }

    createBarChart(id, title, labels, data, color, unit, yLabel) {
        const canvas = document.getElementById(id);
        if (!canvas) {
            console.warn("Canvas " + id + " not found");
            return;
        }

        // Destroy existing chart instance
        if (this.charts[id]) {
            this.charts[id].destroy();
            delete this.charts[id];
        }

        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 200);
        grad.addColorStop(0, color + 'dd');
        grad.addColorStop(1, color + '33');

        // Sanitize data
        const validData = data.map(v => Utils.isValid(v) ? v : 0);

        this.charts[id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: title,
                    data: validData,
                    backgroundColor: grad,
                    borderColor: color,
                    borderWidth: 2,
                    borderRadius: 6,
                    hoverBackgroundColor: color + '99',
                    hoverBorderColor: color,
                    hoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 600,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#94a3b8',
                            font: { size: 11, weight: '600' },
                            boxWidth: 12,
                            boxHeight: 12,
                            padding: 12
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10,14,26,0.95)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: color + '66',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: ctx => ctx.parsed.y.toFixed(2) + unit
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(30,45,69,0.2)', drawBorder: false },
                        ticks: { color: '#94a3b8', font: { size: 11, weight: '500' } }
                    },
                    y: {
                        grid: { color: 'rgba(30,45,69,0.2)', drawBorder: false },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 11 },
                            callback: value => value.toFixed(1) + unit
                        },
                        title: {
                            display: true,
                            text: yLabel,
                            color: '#64748b',
                            font: { size: 11, weight: '600' }
                        }
                    }
                }
            }
        });
    }

    createPVDiagram(report) {
        const canvas = document.getElementById('pvChart');
        if (!canvas) return;

        if (this.charts['pvChart']) {
            this.charts['pvChart'].destroy();
            delete this.charts['pvChart'];
        }

        const stages = report.stages;
        const datasets = stages.map((s, i) => {
            const P1 = 100 + i * 30;
            const P2 = P1 * (s.pressureRatio || 2);
            const V1 = 0.8 / (i + 1);
            const V2 = V1 / (s.pressureRatio || 2);
            const n = s.polytropicIndex || 1.4;
            const color = this.palette[i % this.palette.length];

            const points = [];
            for (let j = 0; j <= 50; j++) {
                const frac = j / 50;
                const V = V1 + (V2 - V1) * frac;
                const P = P1 * Math.pow(V1 / V, n);
                points.push({ x: V, y: P });
            }

            return {
                label: "Stage " + s.number,
                data: points,
                borderColor: color,
                backgroundColor: color + '22',
                borderWidth: 2,
                pointRadius: 0,
                showLine: true,
                fill: false,
                tension: 0.3
            };
        });

        const ctx = canvas.getContext('2d');
        this.charts['pvChart'] = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                plugins: {
                    legend: { labels: { color: '#94a3b8', font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            label: ctx => `P: ${ctx.parsed.y.toFixed(2)} kPa, V: ${ctx.parsed.x.toFixed(3)} m³/kg`
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Specific Volume (m³/kg)', color: '#94a3b8' },
                        grid: { color: 'rgba(30,45,69,0.2)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        title: { display: true, text: 'Pressure (kPa)', color: '#94a3b8' },
                        grid: { color: 'rgba(30,45,69,0.2)' },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    createTSDiagram(report) {
        const canvas = document.getElementById('tsChart');
        if (!canvas) return;

        if (this.charts['tsChart']) {
            this.charts['tsChart'].destroy();
            delete this.charts['tsChart'];
        }

        const stages = report.stages;
        const datasets = stages.map((s, i) => {
            const T1 = 300 + i * 10;
            const T2 = T1 * (s.temperatureRatio || 1.5);
            const S1 = i * 0.05 + 0.1;
            const S2 = S1 + 0.1 * (s.pressureRatio || 2);
            const color = this.palette[i % this.palette.length];

            const points = [];
            for (let j = 0; j <= 50; j++) {
                const frac = j / 50;
                const S = S1 + (S2 - S1) * frac;
                const T = T1 + (T2 - T1) * frac;
                points.push({ x: S, y: T });
            }

            return {
                label: "Stage " + s.number,
                data: points,
                borderColor: color,
                backgroundColor: color + '22',
                borderWidth: 2,
                pointRadius: 0,
                showLine: true,
                fill: false,
                tension: 0.3
            };
        });

        const ctx = canvas.getContext('2d');
        this.charts['tsChart'] = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                plugins: {
                    legend: { labels: { color: '#94a3b8', font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            label: ctx => `T: ${ctx.parsed.y.toFixed(2)} K, S: ${ctx.parsed.x.toFixed(2)} kJ/kg·K`
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Entropy (kJ/kg·K)', color: '#94a3b8' },
                        grid: { color: 'rgba(30,45,69,0.2)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        title: { display: true, text: 'Temperature (K)', color: '#94a3b8' },
                        grid: { color: 'rgba(30,45,69,0.2)' },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    createCompressorMap(report) {
        const canvas = document.getElementById('compressorMapChart');
        if (!canvas) return;

        if (this.charts['compressorMapChart']) {
            this.charts['compressorMapChart'].destroy();
            delete this.charts['compressorMapChart'];
        }

        const stages = report.stages;
        const labels = stages.map(s => "Stage " + s.number);
        const effData = stages.map(s => s.efficiency || 70);
        const headData = stages.map(s => s.head || 0);

        const ctx = canvas.getContext('2d');
        this.charts['compressorMapChart'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Efficiency',
                    data: effData,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 9,
                    pointBackgroundColor: '#22c55e',
                    pointBorderColor: '#22c55e',
                    pointBorderWidth: 2,
                    yAxisID: 'y'
                }, {
                    label: 'Polytropic Head',
                    data: headData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 9,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                plugins: {
                    legend: { labels: { color: '#94a3b8', font: { size: 10 } } }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(30,45,69,0.2)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        position: 'left',
                        title: { display: true, text: 'Efficiency (%)', color: '#94a3b8' },
                        grid: { color: 'rgba(30,45,69,0.2)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y1: {
                        position: 'right',
                        title: { display: true, text: 'Head (kJ/kg)', color: '#94a3b8' },
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    showEmptyState() {
        const ids = ['pressureChart', 'temperatureChart', 'powerChart', 'efficiencyChart',
                     'humidityChart', 'condensationChart', 'pvChart', 'tsChart', 'compressorMapChart'];
        ids.forEach(id => this.showEmptyChart(id));
    }

    showEmptyChart(id) {
        const canvas = document.getElementById(id);
        if (!canvas) return;

        if (this.charts[id]) {
            this.charts[id].destroy();
            delete this.charts[id];
        }

        const ctx = canvas.getContext('2d');
        this.charts[id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['No Data'],
                datasets: [{
                    label: 'Run simulation to see results',
                    data: [0],
                    backgroundColor: '#1a2332',
                    borderColor: '#2a3d5a',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                    y: { grid: { display: false }, ticks: { display: false } }
                }
            }
        });
    }

    destroyAll() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                try { this.charts[key].destroy(); } catch (e) { /* ignore */ }
                delete this.charts[key];
            }
        });
        this.initialized = false;
    }
}