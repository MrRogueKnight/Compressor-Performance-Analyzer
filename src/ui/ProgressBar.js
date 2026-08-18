/**
 * Progress Bar Controller
 */
export class ProgressBar {
    show(status, progress) {
        const container = document.getElementById('progressContainer');
        if (!container) return;
        container.style.display = 'block';
        document.getElementById('progressFill').style.width = Math.min(100, progress) + '%';
        document.getElementById('progressStatus').textContent = status;
    }

    hide() {
        const container = document.getElementById('progressContainer');
        if (!container) return;
        container.style.display = 'none';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressStatus').textContent = 'Initializing...';
    }
}