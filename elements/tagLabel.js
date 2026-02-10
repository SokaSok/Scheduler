/**
 * @fileoverview Component for standardized tag display.
 * Manages hierarchy (breadcrumbs), proportional resizing
 * and styling based on the tag's HSL colors.
 */

class TagLabel {
    /**
     * @param {Object} params
     * @param {string} params.tagId - Main tag ID.
     * @param {Object} [params.tagOverride] - Optional. "Live" data (for real-time preview before saving).
     * @param {boolean} [params.upscale=false] - If true, upscale the element (for ModalTag).
     * @param {string} [params.className=''] - Addictional CSS classes for container.
     * @param {Function} [params.onClick] - Click Callback.
     */
    constructor({ tagId, tagOverride = null, upscale = false, className = '', onClick = null }) {
        this.tagId = tagId;
        this.tagOverride = tagOverride; // For live preview
        this.upscale = upscale;
        this.className = className;
        this.onClick = onClick;
        
        this.element = this.render();
    }

    /**
     * Gets tag from global database o uses override.
     * @param {string} id 
     */
    getTag(id) {
        if (this.tagOverride && (this.tagOverride.id === id || !id)) {
            return this.tagOverride;
        }
        return App.tagTable?.get_list().find(t => t.id === id);
    }

    render() {
        const mainTag = this.getTag(this.tagId);
        if (!mainTag) return document.createElement('div');

        // 1. hierarchical chain (Ancestors -> Main)
        let chain = [];
        let curr = mainTag;
        let depth = 0;
        
        while (curr && depth < 5) {
            chain.unshift(curr); // Add at the head
            if (!curr.parent) break;
            curr = App.tagTable.values.find(t => t.id === curr.parent);
            depth++;
        }

        // 2. Flex container
        const container = document.createElement('div');
        container.className = `flex flex-row items-start gap-1 select-none ${this.className}`;
        if (this.onClick) {
            container.classList.add('cursor-pointer');
            container.addEventListener('click', (e) => this.onClick(e));
        }

        // 3. Chain rendering
        chain.forEach((tag, index) => {
            const isMain = index === chain.length - 1;
            
            // Proportional calculation: 
            // Main = 1.0, Parent = 0.8, GrandParent = 0.6, etc.
            // Formula: 1 - (distance * 0.2)
            const distance = (chain.length - 1) - index;
            const scaleFactor = Math.max(0.5, 1 - (distance * 0.15));
            
            // Base size classes
            // If upscale (Modal) starts from bigger base
            const baseFontSize = this.upscale ? 16 : 12; // px
            const fontSize = baseFontSize * scaleFactor;
            const paddingY = this.upscale ? 6 : 2;
            const paddingX = this.upscale ? 8 : 4;

            const el = document.createElement('div');
            
            // Base styles
            el.className = `
                rounded shadow-sm flex items-center justify-center
                font-bold transition-all box-border
                ${isMain ? 'border-[1px] border-l-2' : 'border-l-2 opacity-90 hover:opacity-100'}
            `;

            // HSL
            const bg = `hsl(${tag.h}, 85%, 92%)`;
            const border = `hsl(${tag.h}, 70%, 40%)`;
            const text = `hsl(${tag.h}, 50%, 20%)`;

            Object.assign(el.style, {
                backgroundColor: bg,
                borderColor: border,
                color: text,
                fontSize: `${fontSize}px`,
                padding: `${paddingY * scaleFactor}px ${paddingX * scaleFactor}px`,
                marginTop: '0px'
            });

            // Contenuto: Ancestors just Emoji, Main Emoji + Name
            if (isMain) {
                el.innerHTML = `<span class="mr-1">${tag.emoji}</span> <span class="truncate max-w-[100px]">${tag.name}</span>`;
            } else {
                el.innerHTML = `<span>${tag.emoji}</span>`;
                el.title = tag.name; 
            }

            container.appendChild(el);
        });

        return container;
    }
}