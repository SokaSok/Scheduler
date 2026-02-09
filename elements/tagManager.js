/**
 * @typedef {Object} Tag
 * @property {string} id        - Univoque ID
 * @property {string} name      - Univoque name 
 * @property {string} emoji     - Emoji 
 * @property {number} h         - Color hue
 * @property {string} bg_s      - Background color saturation 
 * @property {string} bg_l      - Background color lightning
 * @property {string} border_s  - Border color saturation
 * @property {string} border_l  - Border color lightning
 * @property {string} text_l    - Text color lightining
 */

const TagManager = {
    // Riferimento allo stato globale
    get tags() {
        return App.tagTable.values
    },

    generateRandomTag() {
        const newTag = { 
            id: 't'+Date.now(), 
            name: 'Nuovo', 
            emoji: '🏷️', 
            h: Math.floor(Math.random()*360), 
            bg_s: 90, 
            bg_l: 90, 
            border_s: 70, 
            border_l: 40, 
            text_l: 20 
        }
        this.addTags([newTag])
    },

    /**
     * Aggiunge un nuovo tag e notifica tutti
     * @param {Tag[]} newTags 
     */
    addTags(newTags) {
        newTags.forEach(tag => this.tags.push(tag))
        this.notifyChange('add', newTags);
    },

    /**
     * Aggiorna un tag esistente e notifica
     * @param {Partial<Tag>[]} updatedTags 
     */
    updateTags(updatedTags) {
        const foundTags = []
        updatedTags.forEach(tag => {
            const index = this.tags.findIndex(t => t.id === tag.id);
            if (index !== -1) {
                this.tags[index] = tag;
                foundTags.push(tag)
            }
        })
        this.notifyChange('update', foundTags);
    },

    /**
     * Rimuove un tag e notifica
     * @param {string[]} tagIds 
     */
    deleteTags(tagIds) {
        const foundTags = []
        tagIds.forEach(tagId => {
            const index = this.tags.findIndex(t => t.id === tagId);
            if (index !== -1) {
                const removed = this.tags.splice(index, 1)[0];
                foundTags.push(removed)
            }
        })
        this.notifyChange('delete', foundTags);

        if (!this.tags.length) {
            this.generateRandomTag()
        }
    },

    /**
     * Il cuore del sistema: lancia un evento personalizzato
     * @param {string} action 
     * @param {Partial<Tag>[]} tags 
     */
    notifyChange(action, tags) {
        const event = new CustomEvent('app:tags-updated', {
            detail: { action, tags }
        });
        window.dispatchEvent(event);
        
        // Opzionale: Salva su LocalStorage/DB qui
        console.log(`Tags updated: ${action}`, tags);
    }
};