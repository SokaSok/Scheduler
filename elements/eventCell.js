/**
 * @typedef {Object} AddictionaEventParams
 * @property {string}   id
 * @property {string}   dayIndex
 * @property {string}   title
 * @property {string?}  tagId       - Tag reference to indicate event category    
 * @property {string?}  details     - Details formatted as HMTL
 */

/**
 * @typedef {CellParams & AddictionaEventParams} EventCellParams
 */

/**
 * Cell rapresenting an event.
 * The associated html element can be
 * - Resized by both sides
 * - Dragged to another position into the same SchedulerRow or into another one
 * - Quickly modified according to title and tag
 * - DoubleClicked to show the EventModal responsable for complete changes [to be implemented]
 */
class EventCell extends Cell {
    /**
     * @param {EventCellParams} params 
     */
    constructor(params) {
        super({
            ...params,
            classes : 
            `event-cell
            absolute z-8
            cursor-pointer select-none
            flex flex-col gap-1
            group
            border-l-4 rounded shadow-sm 
            text-xs              
            ${params.classes || ''}`,
            y : 0,
            isDraggable : true
        })
        this.tagId = params.tagId
        this.title = params.title
        this.details = params.details

        // Rendering
        this.updateColors()
        this.addElements()
        this.renderResizeHandles();

        // Listeners
        this.element.addEventListener('dragstart', this.handleDragStart);
        this.element.addEventListener('dragend', this.handleDragEnd);
    }

    updateColors() {
        if (typeof App !== 'undefined' && App.tagTable) {
             const tag = App.tagTable.values.find(t => t.id === this.tagId) || App.tagTable.values[0];
             this.element.style.backgroundColor = `hsl(${tag.h}, ${tag.bg_s}%, ${tag.bg_l}%)`;
             this.element.style.borderLeftColor = `hsl(${tag.h}, ${tag.border_s}%, ${tag.border_l}%)`;
             this.element.style.color = `hsl(${tag.h}, 50%, ${tag.text_l}%)`;
        } else {
             // Emergency visual fallback
             this.element.classList.add('bg-blue-100', 'border-blue-500', 'text-blue-700');
        }
    }

    addElements() {
        this.addTime()
        this.addTitle()
        this.addDetails()
        this.addTagSelector()
    }

    /**
     * Returns formatted time string
     * @param {Date?} start 
     * @param {Date?} end 
     * @returns {string}
     */
    getTime(start = this.start, end = this.end) {
        return `${timeFormatter2Digit.format(start)} - ${timeFormatter2Digit.format(end)}`;
    }

    /**
     * Composes time string and updates element time attribute and time label
     * @param {Date?} start 
     * @param {Date?} end 
     */
    updateTime(start, end) {
        const time = this.getTime(start, end)
        const textSpan = this.element.querySelector('.time');
        textSpan.textContent = time
        this.element.setAttribute('time', time);
    }

    addTime() {
        let titleInput = createEl('span', {
            classes: 
            `time
            w-full flex-1 p-1
            bg-transparent text-xs`
        });
        this.element.appendChild(titleInput)
        this.updateTime()
    }

    addTitle() {
        let titleInput = createEl('textarea', {
            classes: 
            `w-full flex-1 p-2
            bg-transparent hover:bg-white 
            transition duration-300 ease-in-out
            resize-none outline-none overflow-hidden 
            text-sm font-semibold leading-tight`,
            attributes: { rows: 1 },
            innerText: this.title || '',
            triggers: {
                change: (e) => { this.title = e.target.value; },
                click: (e) => e.stopPropagation()
            }
        });
        this.element.appendChild(titleInput)
    }
    
    // DOUBT: details may be visible only into EventModal
    addDetails() {
        // TODO: add details container or show modal button?
    }

    addTagSelector() {
        // TODO: implement dedicated class
        const tag = APP_STATE.tags.find(el => el.id === this.tagId)

        let tagWrapper = createEl('div', { 
            classes: `custom-select-wrapper mt-auto` });
        let tagDisplay = createEl('div', {
            classes: 
            `flex items-center gap-1 
            text-[12px] opacity-70 
            hover:opacity-100 transition`,
            innerHTML: `<span class="p-1">${tag.emoji}</span> <span>${tag.name}</span>`
        });

        let tagList = createEl('div', { 
            classes: 
            `custom-select-list` 
        });

        App.tagTable.values.forEach(t => {
            let item = createEl('div', {
                classes: 
                `custom-select-item text-xs`,
                innerHTML: `${t.emoji} ${t.name}`,
                triggers: {
                    click: (e) => {
                        e.stopPropagation();
                        this.tagId = t.id;
                        this.updateColors();
                    }
                }
            });
            tagList.appendChild(item);
        });

        // Input for new tag in dropdown
        let newTagInput = createEl('input', {
            classes: `w-full border-t p-1 text-xs outline-none`,
            attributes: { placeholder: 'Nuovo tag...' },
            triggers: {
                keydown: (e) => {
                    if(e.key === 'Enter' && e.target.value) {
                        const newTag = { 
                            id: 't'+Date.now(), 
                            name: e.target.value, 
                            emoji: '🏷️', 
                            h: Math.floor(Math.random()*360),
                            bg_s: 85, bg_l: 92, border_s: 70, border_l: 40, text_l: 20
                        };
                        App.tagTable.values.push(newTag);
                        this.tagId = newTag.id;
                        // TODO: render all EventCells and tag table
                        //this.renderAll();
                    }
                }
            }
        });
        tagList.appendChild(newTagInput);
        tagWrapper.appendChild(tagDisplay);
        tagWrapper.appendChild(tagList);
        
        tagDisplay.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-list')
            .forEach(l => l !== tagList && l.classList.remove('open'));
            tagList.classList.toggle('open');
        });

        this.element.appendChild(tagWrapper)
    }


    /**
     * Creates side grabbable anchors to trigger resizing
     */
    renderResizeHandles() {
        const handleClass = 
        `absolute top-0 bottom-0 w-2 
        cursor-ew-resize 
        hover:bg-black/10 z-30 transition-colors`;
        
        // Left Handle (Start)
        this.leftHandle = createEl('div', { classes: `${handleClass} left-0` });
        this.leftHandle.addEventListener('mousedown', (e) => this.initResize(e, 'left'));
        
        // Right Handle (End)
        this.rightHandle = createEl('div', { classes: `${handleClass} right-0` });
        this.rightHandle.addEventListener('mousedown', (e) => this.initResize(e, 'right'));

        this.element.appendChild(this.leftHandle);
        this.element.appendChild(this.rightHandle);
    }

    // --- Movement logic (Drag & Drop API) ---

    /**
     * @param {MouseEvent} e 
     */
    handleDragStart = (e) => {
        e.dataTransfer.effectAllowed = 'move';
        const rect = this.element.getBoundingClientRect();
        const grabOffset = e.clientX - rect.left;

        const payload = JSON.stringify({
            id: this.id,
            sourceRowId: this.dayIndex,
            w: this.w,
            durationMs: this.end.getTime() - this.start.getTime(),
            tagId: this.tagId,
            title: this.title,
            details: this.details,
            startOffsetMs: this.start.getTime(),
            grabOffset
        });
        e.dataTransfer.setData('application/json', payload);

        // 1. Nascondiamo l'immagine di drag nativa (setDragImage non supportato ovunque, fallback img trasparente)
        const emptyImg = new Image();
        emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(emptyImg, 0, 0);

        // 2. Avviamo il nostro sistema visuale custom
        // Passiamo l'elemento attuale per clonarlo
        // Passiamo un oggetto payload decodificato per uso interno (più comodo del JSON string)
        DragState.start(
            JSON.parse(payload), 
            this.element, 
            e.clientX
        );
        
        // Hiding of original element
        setTimeout(() => this.element.classList.add('opacity-0'), 0);
    }

    handleDragEnd = (e) => {
        // Ripuliamo il ghost
        DragState.stop();
        // Riportiamo l'originale visibile (nel caso il drop fallisca o sia una copia)
        this.element.classList.remove('opacity-0');
        this.element.classList.remove('opacity-50');
    }

    // --- Resizing logic (Mouse Events) ---

    /**
     * - Adds mouse listeners to windows
     * - populates inner properties to be used to modify element geometry and time values
     * @param {MouseEvent} e 
     * @param {'left' | 'right'} side 
     */
    initResize(e, side) {
        e.preventDefault();
        e.stopPropagation();

        this.isResizing = true;
        this.resizeSide = side;
        this.initialX = e.clientX;
        
        const rect = this.element.getBoundingClientRect();
        const parentRect = this.element.parentElement.getBoundingClientRect();
        
        this.startState = {
            left: this.element.offsetLeft,
            width: rect.width,
            parentWidth: parentRect.width
        };

        // Global Listener to make it works also with cursor out of this.element
        window.addEventListener('mousemove', this.handleResizeMove);
        window.addEventListener('mouseup', this.handleResizeEnd);
    }

    /**
     * @param {MouseEvent} e 
     */
    handleResizeMove = (e) => {
        if (!this.isResizing) return;

        const deltaX = e.clientX - this.initialX;
        let newWidth, newLeft;

        if (this.resizeSide === 'right') {
            // Modifies just width
            newWidth = Math.max(10, this.startState.width + deltaX); // Min 10px
            this.element.style.width = `${newWidth}px`;
            
            // Updates this.w (percentage) for consistency
            this.w = newWidth / this.startState.parentWidth;
        } else {
            // Modifies left and width
            // Note: positive deltaX moves to right (reduces width), negative to left (increases width)
            newWidth = Math.max(10, this.startState.width - deltaX);
            newLeft = this.startState.left + deltaX;

            this.element.style.width = `${newWidth}px`;
            this.element.style.left = `${newLeft}px`;
            
            // Updates this.x and this.w (percentage) for consistency
            this.x = newLeft / this.startState.parentWidth;
            this.w = newWidth / this.startState.parentWidth;
        }

        const {startMs, endMs} = this.calculateDatesFromGeometry()

        this.start = new Date(startMs)
        this.end = new Date(endMs)
        this.updateTime();
    }

    /**
     * Calculates new start and end from element geometry.
     * Returns new dates in milliseconds.
     * @returns {{
     *  startMs : number,
     *  endMS : number,
     * }}
     */
    calculateDatesFromGeometry() {
        const parentRow = ROW_REGISTRY.get(this.dayIndex)
        if (!parentRow) return
        
        const parentWidth = this.startState.parentWidth;
        
        // Convert PX to Percentage
        // Note: if resize by left side, uses newLeftPx, else currentLeft
        const currentLeftPx = this.element.offsetLeft; 
        
        const xPct = currentLeftPx / parentWidth;
        const wPct = parseFloat(this.element.style.width) / parentWidth;

        // Reverse time calculation (complementary to that one in SchedulerRow)
        const rowStartMs = parentRow.start.getTime();
        const rowEndMs = parentRow.end.getTime();
        const totalDuration = rowEndMs - rowStartMs;
        
        // Header subtraction (0.05)
        const availableSpace = 1 - SchedulerRow.headerWidth;
        
        // Getting time X
        const timeX = Math.max(0, xPct - 0.05); 
        const ratioStart = timeX / availableSpace;
        const ratioDur = wPct / availableSpace;
        
        const newStartMs = rowStartMs + (ratioStart * totalDuration);
        const newEndMs = newStartMs + (ratioDur * totalDuration);
        
        return {
            startMs : newStartMs,
            endMs : newEndMs
        }
    }

    /**
     * Removes mouse listener from window and sends updated infoes to parent SchedulerRow
     * @param {MouseEvent} e 
     * @returns 
     */
    handleResizeEnd = (e) => {
        if (!this.isResizing) return;
        this.isResizing = false;

        window.removeEventListener('mousemove', this.handleResizeMove);
        window.removeEventListener('mouseup', this.handleResizeEnd);

        // Notify updates to controller/row to save them.
        this.sendInfoesToParent();
    }

    /**
     * Creates a custom event to be listened by parent SchedulerRow.
     * Called on resizing end.
     */
    sendInfoesToParent() {
        const event = new CustomEvent('event-resize', {
            detail: { 
                id: this.id,
                x: this.x,
                w: this.w,
                start : this.start,
                end : this.end
            },
            bubbles: true
        });
        this.element.dispatchEvent(event);
    }
}