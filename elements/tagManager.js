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
     * Adds tag and notifies the change
     * @param {Tag[]} newTags 
     */
    addTags(newTags) {
        newTags.forEach(tag => this.tags.push(tag))
        this.notifyChange('add', newTags);
    },

    /**
     * Updates tag and notifies the change
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
     * Deletestag notifies the change
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
     * Launch global event
     * @param {string} action 
     * @param {Partial<Tag>[]} tags 
     */
    notifyChange(action, tags) {
        const event = new CustomEvent('app:tags-updated', {
            detail: { action, tags }
        });
        window.dispatchEvent(event);
        
        // From here saving logic
        console.log(`Tags updated: ${action}`, tags);
    },

    /**
     * Checks if a specific tag or any of its ancestors is involved in a list of modified tags.
     * This ensures that if a Parent Tag changes color, the Child Tag (assigned to the event) detects the change.
     * @param {string} eventTagId - The ID of the tag currently assigned to the event.
     * @param {Array<{id: string}>} modifiedTags - The list of tags that have been updated/modified.
     * @returns {boolean} True if the eventTag or one of its ancestors is in the modified list.
     */
    isTagAffected(eventTagId, modifiedTags) {
        if (!eventTagId || !modifiedTags || modifiedTags.length === 0) return false;

        // Optimize lookup by creating a Set of modified IDs
        const modifiedIds = new Set(modifiedTags.map(t => t.id));

        // Start checking from the current tag
        let currentTag = this.tags.find(t => t.id === eventTagId);
        
        // Traverse up the hierarchy
        let depth = 0;
        const MAX_DEPTH = 10; // Safety break for potential circular refs

        while (currentTag && depth < MAX_DEPTH) {
            // Check if current level is modified
            if (modifiedIds.has(currentTag.id)) {
                return true;
            }

            // Move to parent
            if (currentTag.parent) {
                currentTag = this.tags.find(t => t.id === currentTag.parent);
                depth++;
            } else {
                // Root reached
                break;
            }
        }

        return false;
    },
};