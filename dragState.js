// Stato condiviso per il Drag & Drop
const DragState = {
    isDragging: false,
    payload: null, // { id, durationMs, grabOffset, ... }
    tooltip: null, // Riferimento all'elemento DOM del tooltip
    
    start(payload) {
        this.isDragging = true;
        this.payload = payload;
        this.createTooltip();
    },
    
    stop() {
        this.isDragging = false;
        this.payload = null;
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    },

    createTooltip() {
        this.tooltip = createEl('div', {
            classes: 
            `fixed z-50 
            bg-black text-white 
            font-mono text-xs 
            px-2 py-1 rounded 
            pointer-events-none 
            shadow-lg opacity-90`
        });
        document.body.appendChild(this.tooltip);
    },

    updateTooltip(text, x, y) {
        if (!this.tooltip) return;
        this.tooltip.textContent = text;
        // Posizioniamo il tooltip vicino al mouse, un po' sopra
        this.tooltip.style.left = `${x + 15}px`;
        this.tooltip.style.top = `${y - 10}px`;
    }
};