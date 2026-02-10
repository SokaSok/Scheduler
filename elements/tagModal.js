/**
 * @fileoverview Manages the Tag Editing Modal.
 * Handles dynamic rendering, hierarchy management (parents),
 * circular dependency prevention, and real-time previews.
 */

/**
 * @typedef {Object} TagFormValues
 * @property {string} id    - The tag ID (empty if creating new)
 * @property {string} name  - The visible name
 * @property {string} emoji - The icon
 * @property {number} hue   - The color hue (0-360)
 * @property {string|null} parent - The parent Tag ID
 */

class TagModal {
    constructor() {
        /** @type {HTMLElement|null} Reference to the modal container */
        this.element = null;
        
        /** @type {HTMLElement|null} Reference to the preview container */
        this.previewBox = null;
    }

    /**
     * Renders the modal HTML structure and appends it to the document body.
     */
    render() {
        this.element = document.createElement('div');
        this.element.id = 'modal-tag';
        this.element.className = 'fixed inset-0 z-50 flex items-center justify-center modal-overlay';
        
        this.element.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-80 p-5 flex flex-col gap-4 animate-fade-in">
                <div class="flex justify-between items-center border-b pb-2">
                    <h3 class="text-lg font-bold text-gray-700" id="tag-modal-title">Edit Tag</h3>
                    <button id="btn-close-tag" class="text-gray-400 hover:text-gray-700 material-icons">close</button>
                </div>

                <input type="hidden" id="tag-id">

                <div class="flex flex-col items-center gap-2 bg-gray-50 p-3 rounded border border-gray-100">
                    <span class="text-xs text-gray-400 font-bold uppercase">Preview</span>
                    <div id="tag-preview-container" class="flex flex-wrap items-center gap-1 justify-center w-full min-h-[30px]">
                        </div>
                </div>

                <div class="flex flex-col gap-3">
                    <div class="flex gap-2">
                        <div class="w-1/4">
                            <label class="block text-xs font-bold text-gray-500 mb-1">Icon</label>
                            <input type="text" id="tag-emoji" class="w-full border p-2 rounded text-center focus:border-blue-500 outline-none" placeholder="🏷️">
                        </div>
                        <div class="w-3/4">
                            <label class="block text-xs font-bold text-gray-500 mb-1">Name</label>
                            <input type="text" id="tag-name" class="w-full border p-2 rounded focus:border-blue-500 outline-none" placeholder="Work, Gym...">
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between mb-1">
                            <label class="block text-xs font-bold text-gray-500">Color (Hue)</label>
                            <span id="tag-hue-val" class="text-xs text-gray-400">200°</span>
                        </div>
                        <input type="range" id="tag-hue" min="0" max="360" class="w-full cursor-pointer h-2 rounded-lg appearance-none" 
                               style="background: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red);">
                    </div>

                    <div>
                         <label class="block text-xs font-bold text-gray-500 mb-1">Parent Category</label>
                         <select id="tag-parent" class="w-full border p-2 rounded bg-white focus:border-blue-500 outline-none text-sm">
                             <option value="">(None - Root Level)</option>
                         </select>
                         <p class="text-[10px] text-gray-400 mt-1">* Max 4 nesting levels</p>
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-2 border-t mt-2">
                    <button id="btn-cancel-tag" class="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                    <button id="btn-save-tag" class="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded shadow hover:bg-blue-700">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.element);
        
        // Cache references
        this.inputs = {
            id: this.element.querySelector('#tag-id'),
            emoji: this.element.querySelector('#tag-emoji'),
            name: this.element.querySelector('#tag-name'),
            hue: this.element.querySelector('#tag-hue'),
            hueLabel: this.element.querySelector('#tag-hue-val'),
            parent: this.element.querySelector('#tag-parent')
        };
        
        this.previewContainer = this.element.querySelector('#tag-preview-container');
    }

    /**
     * Initializes event listeners.
     */
    setupListeners() {
        const update = () => this.updatePreview();

        this.inputs.emoji.addEventListener('input', update);
        this.inputs.name.addEventListener('input', update);
        this.inputs.hue.addEventListener('input', update);
        this.inputs.parent.addEventListener('change', update);

        this.element.querySelector('#btn-save-tag').addEventListener('click', () => this.handleSave());
        this.element.querySelector('#btn-close-tag').addEventListener('click', () => this.close());
        this.element.querySelector('#btn-cancel-tag').addEventListener('click', () => this.close());

        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) this.close();
        });

        this.inputs.emoji.addEventListener('focus', (e) => e.target.select());
    }

    /**
     * Populates the parent dropdown with valid options.
     * Filters out:
     * 1. The tag itself (if editing).
     * 2. Direct descendants (children, grandchildren, etc.) to prevent circular loops.
     * 3. Tags that would cause depth > 4 (optional but recommended).
     * * @param {string|null} currentTagId 
     */
    renderParentOptions(currentTagId) {
        const select = this.inputs.parent;
        select.innerHTML = '<option value="">(None - Root Level)</option>';
        
        const allTags = App.tagTable.values;

        // Helper: Find all descendants ID to exclude them
        const getDescendants = (id) => {
            let descendants = [];
            allTags.filter(t => t.parent === id).forEach(child => {
                descendants.push(child.id);
                descendants = descendants.concat(getDescendants(child.id));
            });
            return descendants;
        };

        const forbiddenIds = currentTagId 
            ? [currentTagId, ...getDescendants(currentTagId)] 
            : [];

        allTags.forEach(tag => {
            // Skip forbidden tags
            if (forbiddenIds.includes(tag.id)) return;

            // Simple visual indicator of depth in dropdown
            let depth = 0;
            let p = tag.parent;
            while(p) {
                depth++;
                const parentObj = allTags.find(t => t.id === p);
                p = parentObj ? parentObj.parent : null;
                // Safety break for existing data loops
                if (depth > 10) break; 
            }

            // Optional: Block selection if depth >= 3 (since adding child makes it 4)
            if (depth >= 3) return; 

            const option = document.createElement('option');
            option.value = tag.id;
            // Indent based on hierarchy
            const prefix = '&nbsp;&nbsp;'.repeat(depth) + (depth > 0 ? '└ ' : '');
            option.innerHTML = `${prefix}${tag.emoji} ${tag.name}`;
            select.appendChild(option);
        });
    }

    /**
     * Updates the preview using the TagLabel component logic.
     */
    updatePreview() {
        const hue = parseInt(this.inputs.hue.value);
        this.inputs.hueLabel.textContent = `${hue}°`;
        
        const tempTag = {
            id: this.inputs.id.value || 'temp', // ID fittizio
            name: this.inputs.name.value || 'Nome Tag',
            emoji: this.inputs.emoji.value || '🏷️',
            h: hue,
            parent: this.inputs.parent.value || null
        };

        this.previewContainer.innerHTML = '';
        
        const label = new TagLabel({
            tagId: tempTag.id,
            tagOverride: tempTag,
            upscale: true,       
            className: 'w-full justify-center'
        });

        this.previewContainer.appendChild(label.element);
    }

    /**
     * Creates a badge DOM element for the preview.
     * @param {string} emoji 
     * @param {string} name 
     * @param {number} hue 
     * @param {boolean} isAncestor - If true, renders slightly smaller/lighter
     */
    createBadgeElement(emoji, name, hue, isAncestor) {
        const div = document.createElement('div');
        div.className = `
            px-2 py-1 rounded border-l-2 shadow-sm 
            flex gap-1 items-center transition-colors duration-200
            ${isAncestor ? 'text-xs opacity-70 scale-90' : 'text-sm font-semibold'}
        `;
        
        // HSL Colors
        const bg = `hsl(${hue}, 85%, 92%)`;
        const border = `hsl(${hue}, 70%, 40%)`;
        const text = `hsl(${hue}, 50%, 20%)`;

        Object.assign(div.style, {
            backgroundColor: bg,
            borderLeftColor: border,
            color: text
        });

        div.innerHTML = `<span>${emoji}</span> <span>${name}</span>`;
        return div;
    }

    /**
     * Opens the modal.
     * @param {string|null} tagId - ID to edit, or null for new.
     */
    open(tagId = null) {
        this.render();
        this.setupListeners();
        this.renderParentOptions(tagId);

        if (tagId) {
            // Edit Mode
            const tag = App.tagTable.values.find(t => t.id === tagId);
            if (!tag) { this.close(); return; }

            this.element.querySelector('#tag-modal-title').innerText = 'Modifica Tag';
            this.inputs.id.value = tag.id;
            this.inputs.emoji.value = tag.emoji;
            this.inputs.name.value = tag.name;
            this.inputs.hue.value = tag.h;
            this.inputs.parent.value = tag.parent || '';

        } else {
            // Create Mode
            this.element.querySelector('#tag-modal-title').innerText = 'Nuovo Tag';
            this.inputs.id.value = '';
            this.inputs.emoji.value = '🏷️';
            this.inputs.name.value = '';
            
            // Random Hue
            const randomHue = Math.floor(Math.random() * 360);
            this.inputs.hue.value = randomHue;
            
            // Focus name
            setTimeout(() => this.inputs.name.focus(), 50);
        }

        this.updatePreview();
    }

    handleSave() {
        const id = this.inputs.id.value;
        const name = this.inputs.name.value.trim() || 'Senza nome';
        const emojiInputVal = this.inputs.emoji.value.trim();
        const emoji = (typeof checkEmoji === 'function' ? checkEmoji(emojiInputVal) : emojiInputVal) || '🏷️';
        const h = parseInt(this.inputs.hue.value);
        const parent = this.inputs.parent.value || null;

        const stylePresets = { bg_s: 85, bg_l: 92, border_s: 70, border_l: 40, text_l: 20 };

        const tagData = {
            id: id || 't' + Date.now(),
            name, emoji, h, parent,
            ...stylePresets
        };

        if (id) {
            TagManager.updateTags([tagData]);
        } else {
            TagManager.addTags([tagData]);
        }

        this.close();
    }

    close() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}