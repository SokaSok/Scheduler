class TagSelector {
    /**
     * @param {Object} params
     * @param {string} params.initialTagId - Initial tag ID
     * @param {Function} params.onChange - Callback (newTagId) => void
     */
    constructor({ initialTagId, onChange }) {
        this.currentTagId = initialTagId;
        this.onChange = onChange;
        this.isOpen = false;
        
        this.render();
        window.addEventListener('app:tags-updated', this.handleTagsUpdated);
    }

    render() {
        this.element = createEl('div', { 
            classes: `
                tag-selector
                relative mt-auto w-full`
        });

        // Button
        this.display = createEl('div', {
            classes: `
                flex items-center gap-1 p-1
                text-xs opacity-80 rounded
                cursor-pointer transition-opacity 
                hover:bg-black/5 hover:opacity-100 
            `,
            triggers: {
                click: (e) => this.toggle(e)
            }
        });
        
        // List
        this.list = createEl('div', { 
            classes: `
                absolute z-50 left-0 right-0 bottom-full mb-1
                bg-white border border-gray-200 shadow-lg rounded-md
                flex flex-col gap-1 p-1
                min-w-[120px] max-h-[150px] overflow-y-auto
                hidden
            `
        });

        this.renderListItems();
        this.renderNewTagInput();
        this.updateDisplay();

        this.element.appendChild(this.display);
        this.element.appendChild(this.list);
    }

    /**
     * Updates icon and label
     */
    updateDisplay() {
        const tag = this.getTag(this.currentTagId);
        this.display.innerHTML = `
            <span class="flex-shrink-0">${tag.emoji}</span> 
            <span class="truncate font-medium">${tag.name}</span>
        `;
    }

    renderListItems() {
        this.list.innerHTML = '';
        
        const tags = App.tagTable?.values || [];
        
        tags.forEach(t => {
            let item = createEl('div', {
                classes: `
                    px-2 py-1.5 rounded text-xs
                    hover:bg-gray-100 cursor-pointer 
                    flex items-center gap-2
                    whitespace-nowrap
                `,
                innerHTML: `<span>${t.emoji}</span> <span>${t.name}</span>`,
                triggers: {
                    click: (e) => {
                        e.stopPropagation();
                        this.selectTag(t.id);
                    }
                }
            });
            this.list.appendChild(item);
        });
    }

    renderNewTagInput() {
        let inputContainer = createEl('div', { classes: `border-t mt-1 pt-1` });
        
        let input = createEl('input', {
            classes: `w-full text-xs p-1 outline-none bg-gray-50 rounded`,
            attributes: { placeholder: 'New tag + Enter...' },
            triggers: {
                click: (e) => e.stopPropagation(),
                keydown: (e) => this.handleNewTagKeydown(e)
            }
        });
        
        inputContainer.appendChild(input);
        this.list.appendChild(inputContainer);
    }

    handleNewTagKeydown(e) {
        const txt = e.target.value.trim();
        if (e.key === 'Enter' && txt) {
            const parts = txt.split(' ');
            const emoji = parts.length > 1 && checkEmoji(parts.splice(0,1));
            const name = parts.join(' ')
            const newTag = { 
                id: 't' + Date.now(), 
                name, 
                emoji: emoji || '🏷️', 
                h: Math.floor(Math.random() * 360),
                bg_s: 85, bg_l: 92, border_s: 70, border_l: 40, text_l: 20
            };
            
            // Updates tags
            TagManager.addTags([newTag]); 
            
            this.selectTag(newTag.id);
            e.target.value = '';

            // this.renderListItems(); 
            // this.renderNewTagInput();
        }
    }

    handleTagsUpdated = (e) => {
        // Ricostruisci la lista (è veloce, sono pochi elementi DOM)
        this.renderListItems();
        
        // Se il tag attualmente selezionato è stato modificato, aggiorna la label visibile
        if (e.detail.action === 'update' && e.detail.tags.some(({id}) => id === this.currentTagId)) {
            this.updateDisplay();
        }
    }

    selectTag(id) {
        this.currentTagId = id;
        this.updateDisplay();
        this.close();
        
        if (this.onChange) {
            this.onChange(id);
        }
    }

    toggle(e) {
        e.stopPropagation();
        document.querySelectorAll('.tag-selector .hidden').forEach(el => {
            if (el !== this.list) el.classList.add('hidden');
        });

        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.list.classList.remove('hidden');
        document.addEventListener('click', this.handleOutsideClick);
    }

    close() {
        this.isOpen = false;
        this.list.classList.add('hidden');
        document.removeEventListener('click', this.handleOutsideClick);
    }

    handleOutsideClick = (e) => {
        if (this.isOpen && !this.element.contains(e.target)) {
            this.close();
        }
    }

    getTag(id) {
        if (!App.tagTable) return { name: '?', emoji: '❓' };
        return App.tagTable.values.find(t => t.id === id) || App.tagTable.values[0];
    }

    delete() {
        window.removeEventListener('app:tags-updated', this.handleTagsUpdated);

        if (this.isOpen) {
            document.removeEventListener('click', this.handleOutsideClick);
        }
        this.element.remove();
    }
}