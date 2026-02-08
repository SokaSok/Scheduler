/**
 * Shared drag state
 */
const DragState = {
    isDragging: false,
    payload: null, 
    ghostElement: null, // Visual clone

    // Geometry
    grabOffsetX: 0,
    grabOffsetY: 0,
    initialWidth: 0,

    // Phisycs
    physics: new DragPhysics(),
    baseRotation: 0, // Natural rotation due to grab point

    /**
     * @param {Object} payload - Logic data
     * @param {HTMLElement} originalElement - Original DOM element to be cloned
     * @param {number} startX - Mouse X at start
     * @param {number} startY - Mouse Y at start
     */
    start(payload, originalElement, startX, startY) {
        this.isDragging = true;
        this.payload = payload;
        
        // Offset calculation relative to cursor
        const rect = originalElement.getBoundingClientRect();
        this.grabOffsetX = startX - rect.left;
        this.grabOffsetY = startY - rect.top;
        this.initialWidth = rect.width;

        // Initialize physics
        this.physics.reset(startX);
        
        // Static rotation
        // Grabbed at center --> 0deg. By sides --> rotated
        this.baseRotation = this.physics.getStaticRotation(this.grabOffsetX, rect.width);

        this.createGhost(originalElement);

        // Starting position
        this.updateGhost(null, startX, startY);
    },
    
    stop() {
        this.isDragging = false;
        this.payload = null;

        if (this.ghostElement) {
            // DOUBT: Exit animation?
            this.ghostElement.remove();
            this.ghostElement = null;
        }
    },

    /**
     * @param {HTMLElement} originalElement 
     */
    createGhost(originalElement) {
        this.ghostElement = originalElement.cloneNode(true);
        
        // Copying dimensions
        const rect = originalElement.getBoundingClientRect();
        this.ghostElement.style.width = `${rect.width}px`;
        this.ghostElement.style.height = `${rect.height}px`;
       
        Object.assign(this.ghostElement.style, {
            position: 'fixed',
            zIndex: '9999',
            pointerEvents: 'none',
            opacity: '0.8',
            // Making animation less twichy
            transition: 
                `transform 0.1s ease-out,
                scale 0.2s ease-in-out`,
            boxShadow: 
                `0 20px 25px -5px rgba(0, 0, 0, 0.2), 
                0 10px 10px -5px rgba(0, 0, 0, 0.1)`,
            // Reset margin/transform origin
            margin: 0,
            transformOrigin: `${this.grabOffsetX}px ${this.grabOffsetY}px` // fulcrum
        });

        document.body.appendChild(this.ghostElement);
    },

    /**
     * Update ghost position and label
     * @param {string?} timeLabel - New time text
     * @param {number} mouseX - X absolute coordinate
     * @param {number} mouseY - Y absolute coordinate
     */
    updateGhost(timeLabel, mouseX, mouseY) {
        if (!this.ghostElement) return;
        
        // Position
        const left = mouseX - this.grabOffsetX;
        const top = mouseY - this.grabOffsetY - 10;
        
        this.ghostElement.style.left = `${left}px`;
        this.ghostElement.style.top = `${top}px`;

        // Physics 
        // Rotation = Gravity + Movement
        const inertiaRotation = this.physics.getInertiaRotation(mouseX);
        const totalRotation = this.baseRotation + inertiaRotation;
        this.ghostElement.style.transform = `rotate(${-totalRotation}deg) scale(1.2)`;

        // Time label
        if (!timeLabel) return
        const timeSpan = this.ghostElement.querySelector('.time');
        if (timeSpan) {
            timeSpan.textContent = timeLabel;
            // Highlightning time label
            timeSpan.classList.add(
                'rounded-sm', 
                'border-2', 
                'border-dashed',
                'border-[color:var(--bd-trd)]',
                'bg-[var(--bg-snd)]',
                'font-bold'
            )
        }
    }
};