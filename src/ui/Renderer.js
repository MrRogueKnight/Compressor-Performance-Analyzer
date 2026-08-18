/**
 * Base Renderer - provides utility methods for all renderers
 */
export class Renderer {
    static showEmpty(containerId, icon, title, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="empty-state"><span class="empty-icon">${icon}</span><h3>${title}</h3><p>${message}</p></div>`;
        }
    }

    static showWarning(message) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-banner warning';
        warningDiv.innerHTML = '⚠️ ' + message;
        return warningDiv;
    }
}