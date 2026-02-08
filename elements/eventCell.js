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
        const {bg, text, border} = getTagColors(this.tagId)
        this.element.style.backgroundColor = bg
        this.element.style.color = text
        this.element.style.borderLeftColor = border
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
            w-22 max-w-full p-0.5 m-1
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
        this.tagSelector = new TagSelector({
            initialTagId: this.tagId,
            onChange: (newId) => {
                this.tagId = newId;
                this.updateColors(); 
                
                // DOUBT: notify to SchedulerRow updating?
                // this.notifyChange(); 
            }
        });

        this.element.appendChild(this.tagSelector.element);
    }

    /**
     * Updates verticale position and height according to row-calculated layout.
     * @param {number} laneIndex
     * @param {number} totalLanes
     * @param {number} span - How many lanes must be occupied (default 1)
     */
    updateVerticalLayout(laneIndex, totalLanes, span = 1) {
        const singleLaneHeight = 100 / totalLanes;
        const heightPct = singleLaneHeight * span;
        const topPct = laneIndex * singleLaneHeight;

        this.element.style.height = `${heightPct}%`;
        this.element.style.top = `${topPct}%`;
        this.element.style.transition = 'top 0.2s ease, height 0.2s ease';
        
        this.h = heightPct / 100;
        this.y = topPct / 100;
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
        const rect = this.element.getBoundingClientRect();
        const grabOffsetX = e.clientX - rect.left;

        const payload = JSON.stringify({
            id: this.id,
            sourceRowId: this.dayIndex,
            w: this.w,
            durationMs: this.end.getTime() - this.start.getTime(),
            tagId: this.tagId,
            title: this.title,
            details: this.details,
            startOffsetMs: this.start.getTime(),
            grabOffsetX
        });

        // Hiding native image (setDragImage may be not supported, fallback transparent img)
        const emptyImg = new Image();
        emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(emptyImg, 0, 0);

        // Initializing DragState
        DragState.start(
            JSON.parse(payload), 
            this.element, 
            e.clientX,
            e.clientY
        );
        
        // Hiding of original element
        setTimeout(() => this.element.classList.add('opacity-0'), 0);
    }

    handleDragEnd = (e) => {
        // Cleaning ghost element
        DragState.stop();
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

        const parentRow = ROW_REGISTRY.get(this.dayIndex);
        if (!parentRow) return;

        const deltaX = e.clientX - this.initialX;
        const parentWidth = this.startState.parentWidth;
        const totalDuration = parentRow.totalDuration;

        let rawNewWidthPx = this.startState.width;
        let rawNewLeftPx = this.startState.left;

        if (this.resizeSide === 'right') {
            rawNewWidthPx = Math.max(10, this.startState.width + deltaX);
        } else {
            rawNewWidthPx = Math.max(10, this.startState.width - deltaX);
            rawNewLeftPx = this.startState.left + deltaX;
        }

        // --- Snapping Logic ---
        const availableSpace = 1 - SchedulerRow.headerWidth;
        
        // Start
        const leftPct = rawNewLeftPx / parentWidth;
        const timeXPct = Math.max(0, leftPct - SchedulerRow.headerWidth);
        const rawStartRatio = timeXPct / availableSpace;
        const rawStartMs = parentRow.start.getTime() + (rawStartRatio * totalDuration);

        // Duaration
        const widthPct = rawNewWidthPx / parentWidth;
        const rawDurRatio = widthPct / availableSpace;
        const rawDurationMs = rawDurRatio * totalDuration;
        const rawEndMs = rawStartMs + rawDurationMs;

        // Applying snap
        let snappedStartMs = snapDateToGrid(new Date(rawStartMs)).getTime();
        let snappedEndMs = snapDateToGrid(new Date(rawEndMs)).getTime();

        // Validation
        if (snappedEndMs - snappedStartMs < SNAP_MS) {
            if (this.resizeSide === 'right') snappedEndMs = snappedStartMs + SNAP_MS;
            else snappedStartMs = snappedEndMs - SNAP_MS;
        }

        // Convertion to Pixels
        const snappedStartRatio = (snappedStartMs - parentRow.start.getTime()) / totalDuration;
        const snappedDurationRatio = (snappedEndMs - snappedStartMs) / totalDuration;

        // Spatial projection (inverse of SchedulerRow.calculateGeometryFromDates)
        const snappedXPct = SchedulerRow.headerWidth + (snappedStartRatio * availableSpace);
        const snappedWPct = snappedDurationRatio * availableSpace;

        const finalLeftPx = snappedXPct * parentWidth;
        const finalWidthPx = snappedWPct * parentWidth;

        // Styling and position updating
        this.element.style.width = `${finalWidthPx}px`;
        if (this.resizeSide === 'left') {
            this.element.style.left = `${finalLeftPx}px`;
            this.x = snappedXPct;
        }
        
        this.w = snappedWPct;
        this.start = new Date(snappedStartMs);
        this.end = new Date(snappedEndMs);
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

    delete() {
        this.tagSelector.delete()
        super.delete()
    }
}