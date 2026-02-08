/**
 * Shared drag state
 */
const DragState = {
    isDragging: false,
    payload: null, 
    ghostElement: null, // Visual clone
    grabOffset: 0,      // Grab point on original element

    /**
     * @param {Object} payload - Logic data
     * @param {HTMLElement} originalElement - Original DOM element to be cloned
     * @param {number} startX - Mouse X at start
     */
    start(payload, originalElement, startX) {
        this.isDragging = true;
        this.payload = payload;
        
        // Calcolo offset rispetto al mouse per mantenere la posizione relativa
        const rect = originalElement.getBoundingClientRect();
        this.grabOffset = startX - rect.left;

        this.createGhost(originalElement);
    },
    
    stop() {
        this.isDragging = false;
        this.payload = null;
        if (this.ghostElement) {
            this.ghostElement.remove();
            this.ghostElement = null;
        }
    },

    /**
     * @param {HTMLElement} originalElement 
     */
    createGhost_old(originalElement) {
        this.ghostElement = originalElement.cloneNode(true);
        
        // Copiamo le dimensioni esatte (getComputedStyle assicura width/height precisi)
        const rect = originalElement.getBoundingClientRect();
        this.ghostElement.style.width = `${rect.width}px`;
        this.ghostElement.style.height = `${rect.height}px`;

        // Stili per renderlo flottante
        this.ghostElement.style.position = 'fixed';
        this.ghostElement.style.zIndex = '9999';
        this.ghostElement.style.pointerEvents = 'none'; // FONDAMENTALE: permette al mouse di passare sotto e triggerare dragover sulla Row
        this.ghostElement.style.opacity = '0.9';
        this.ghostElement.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        this.ghostElement.style.transform = 'rotate(2deg)'; // Piccolo effetto "sollevato"
        
        // Puliamo eventuali classi di stato (es. hover, resize handles) se necessario
        // this.ghostElement.classList.remove('hover:bg-gray-50'); 

        document.body.appendChild(this.ghostElement);
    },

    createGhost(originalElement) {
        // Cloniamo profondamente il nodo
        this.ghostElement = originalElement.cloneNode(true);
        
        // Copiamo le dimensioni esatte
        const rect = originalElement.getBoundingClientRect();
        this.ghostElement.style.width = `${rect.width}px`;
        this.ghostElement.style.height = `${rect.height}px`;

        // Stili per renderlo flottante
        this.ghostElement.style.position = 'fixed';
        this.ghostElement.style.zIndex = '9999';
        this.ghostElement.style.pointerEvents = 'none'; 
        this.ghostElement.style.opacity = '0.9';
        this.ghostElement.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        this.ghostElement.style.transform = 'rotate(2deg)';
        
        // --- FIX PER TEXTAREA (Titolo) ---
        // 1. Troviamo la textarea originale e quella clonata
        const originalTx = originalElement.querySelector('textarea');
        const ghostTx = this.ghostElement.querySelector('textarea');
        
        if (originalTx && ghostTx) {
            // 2. Copiamo il valore del testo (fondamentale se l'utente lo ha modificato)
            ghostTx.value = originalTx.value;
            
            // 3. Forziamo lo sfondo trasparente
            // (A volte i browser applicano un background bianco di default alle textarea clonate)
            ghostTx.style.backgroundColor = 'transparent'; 
            
            // 4. Copiamo eventuali stili calcolati critici (opzionale, ma sicuro)
            ghostTx.style.color = getComputedStyle(originalTx).color;
        }
        // ---------------------------------

        document.body.appendChild(this.ghostElement);
    },

    /**
     * Aggiorna posizione e contenuto del clone
     * @param {string} timeLabel - Il nuovo testo dell'orario
     * @param {number} mouseX - Coordinata X assoluta del mouse
     * @param {number} mouseY - Coordinata Y assoluta del mouse
     */
    updateGhost(timeLabel, mouseX, mouseY) {
        if (!this.ghostElement) return;
        
        // 1. Aggiorna Posizione
        // Sottraiamo l'offset per mantenere il mouse nello stesso punto relativo dell'elemento
        const left = mouseX - this.grabOffset;
        const top = mouseY + 10; // Un po' sotto il mouse per visibilità (o tieni mouseY per sovrapposizione esatta)
        
        this.ghostElement.style.left = `${left}px`;
        this.ghostElement.style.top = `${top}px`;

        // 2. Aggiorna Testo Orario
        // Cerchiamo lo span .time all'interno del clone e lo aggiorniamo
        const timeSpan = this.ghostElement.querySelector('.time');
        if (timeSpan) {
            timeSpan.textContent = timeLabel;
            // Opzionale: evidenzia che sta cambiando
            timeSpan.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            timeSpan.style.fontWeight = 'bold';
        }
    }
};