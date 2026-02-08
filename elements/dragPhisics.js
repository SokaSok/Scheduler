class DragPhysics {
    constructor() {
        this.lastX = 0;
        this.velocityX = 0;
        this.maxTilt = 15; // Max rotation degrees
    }

    reset(startX) {
        this.lastX = startX;
        this.velocityX = 0;
    }

    /**
     * Calculates inertial rotation
     * @param {number} currentX 
     * @returns {number} rotation in degrees
     */
    getInertiaRotation(currentX) {
        // Instant velocity
        const deltaX = currentX - this.lastX;
        this.lastX = currentX;

        // Smoothing (Lerp) to avoid rude twiches
        this.velocityX = this.velocityX * 0.8 + deltaX * 0.2;
        
        // Product per air friction factor
        let rotation = -this.velocityX * 2;

        // Clamp to normalize rotation
        return Math.max(-this.maxTilt, Math.min(this.maxTilt, rotation));
    }

    /**
     * Calculates static rotation relative to grab point (Gravity)
     * @param {number} grabOffsetX - Left border distance
     * @param {number} elementWidth 
     * @returns {number} rotation degrees
     */
    getStaticRotation(grabOffsetX, elementWidth) {
        const centerX = elementWidth / 2;
        // Distanza dal centro: -1 (tutto a sx) a +1 (tutto a dx)
        const ratio = (grabOffsetX - centerX) / centerX;
        
        return ratio * 10; // Max 10 static degrees
    }
}