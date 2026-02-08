/**
 * @typedef {Object} SchedulerRowParams
 * @property {number}   width       - Width of the html element: proportional to data range handled by the SchedulerRow (percentage: 0.0 to 1.0)
 * @property {string?}  id          - Univoque ID. Header row hasn't it. In SchedulerRow is the dayIndex 0 based. 
 * @property {string?}  dayIndex    - The same as the ID
 * @property {string?}  classes     - Additional classes for rendering
 * @property {Date}     start       - Start of the first schedulable time
 * @property {Date}     end         - End of the last schedulable time
 * @property {boolean?} isDroppable - If true, can be destination for dragged EventCell
 */

class SchedulerRow {
    /**
     * @param {SchedulerRowParams} param0 
     */
    constructor({
        width,
        id,
        dayIndex,
        classes = '',
        start,
        end,
        isDroppable = true
    }) {
        this.width = width
        this.id = id
        this.dayIndex = dayIndex
        const {start : _start, end : _end} = getStartEndFromString({start, end})
        this.totalDuration = _end.getTime() - _start.getTime()
        this.start = _start
        this.end = _end
        this.isDroppable = isDroppable
        this.classes = `
        relative flex flex-row min-h-[120px]
        border-b-1 border-[color:var(--bd-snd)]
        scheduler-row
        ${classes}`;
        this.render()
        
        this.child = []
        this.events = []

        if (this.isDroppable) {
            this.element.addEventListener('dragover', this.onDragOver);
            this.element.addEventListener('drop', this.onDrop);
            this.element.addEventListener('dragleave', () => {
                this.element.classList.remove('bg-gray-50');
            });
            // Bubbling from EventCell end resize event.
            this.element.addEventListener('event-resize', this.onEventResize);
        }

    }

    /**
     * Offset for row header (percentage)
     */
    static headerWidth = 0.05;

    render() {
        
        const attributes = {
            id : this.id ?? undefined
        }

        this.element = createEl('div' , { 
            classes : this.classes, 
            attributes,
            properties : {width : `${this.width}px`}
        })
    }

    /**
     * @param {TimeCell} cell 
     */
    append(cell) {
        this.child.push(cell)
        this.element.appendChild(cell.element)
    }

    /**
     * @param {EventCell} eventCell 
     */
    appendEvent(eventCell) {
        this.events.push(eventCell);
        this.element.appendChild(eventCell.element);
    }
    
    /**
     * @param {string} eventId 
     * @returns {boolean}
     */
    removeEventById(eventId) {
        const index = this.events.findIndex(evt => evt.id === eventId);
        if (index > -1) {
            const eventToRemove = this.events[index];
            
            if (eventToRemove && typeof eventToRemove.delete === 'function') {
                eventToRemove.delete(); 
            }

            this.events.splice(index, 1);
            return true;
        }
        return false;
    }

    delete() {
        this.child.forEach(el => el.delete())
        this.events.forEach(el => el.delete())
        this.element.remove()
    }

    // --- Projection logic (Time -> Space) ---
    
    /**
     * Converts Date into X and W (0.0 - 1.0)
     * @param {Date} eventStart 
     * @param {Date} eventEnd 
     * @returns {{
     *  x : number,
     *  w : number
     * }}
     */
    calculateGeometryFromDates(eventStart, eventEnd) {
        const startMs = eventStart.getTime();
        const endMs = eventEnd.getTime();
        const durationMs = endMs - startMs;

        // Time percentage calculation (0.0 = day beginning, 1.0 = day ending)
        const timeRatioStart = (startMs - this.start.getTime()) / this.totalDuration;
        const timeRatioDuration = durationMs / this.totalDuration;

        // Time available space calculation (100% - Header)
        const availableSpace = 1 - SchedulerRow.headerWidth;

        // Projection into visible space
        const x = SchedulerRow.headerWidth + (timeRatioStart * availableSpace);
        const w = timeRatioDuration * availableSpace;

        return { x, w };
    }

    /**
     * Converts visual X coordinate into Date
     */
    calculateDateFromVisualX(visualXPct) {
        const availableSpace = 1 - SchedulerRow.headerWidth;
        
        // Header offset removal
        let timeAreaX = visualXPct - SchedulerRow.headerWidth;
        
        // Normalization (if x < 0 forces to 0)
        timeAreaX = Math.max(0, timeAreaX);
        
        // Time ratio calculation
        const timeRatio = Math.min(1, timeAreaX / availableSpace); // Clamp a 1 max

        // Convertion into ms
        const ms = this.start.getTime() + (timeRatio * this.totalDuration);
        return new Date(ms);
    }

    /**
     * Trigger to be passed to child TimeCells.
     * Creates new EventCell at specified coordinates relative to SchedulerRow.element
     * @param {Date} date - Date rapresented by TimeCell
     * @param {Object} cellContext - Other infoes from TimeCell (es. rect, dayIndex) [actually don't used]
     */
    onTimeCellClick = (date, cellContext) => {
        const durationMs = 3600000; 
        const eventEnd = new Date(date.getTime() + durationMs);
        const { x, w } = this.calculateGeometryFromDates(date, eventEnd);
 
        const newEvent = new EventCell({
            id: `evt-${Date.now()}`,
            x: x,
            w: w,
            y: 0,
            start: date,
            end: eventEnd,
            tagId: App.tagTable.values[0].id,
            dayIndex : this.id,
            title: 'New Event',
            isDraggable: true
        });

        this.appendEvent(newEvent);
    }

    
    onDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Ottimizzazione: se non c'è ghost attivo, non calcolare nulla
        if (!DragState.isDragging || !DragState.ghostElement) return;

        this.element.classList.add('bg-gray-50');

        // --- 1. Calcolo Posizione Temporale (Logica simile a onDrop) ---
        const rect = this.element.getBoundingClientRect();
        
        // Mouse X relativo alla riga
        const mouseX = e.clientX - rect.left;
        
        // Usiamo l'offset salvato nel DragState per capire dove inizierebbe l'elemento
        const elementLeftPx = mouseX - DragState.grabOffset;
        
        let visualX = elementLeftPx / rect.width;
        
        // Clamp (Header width e limiti dx)
        // Nota: serve width percentuale dell'evento (w) per il clamp destro.
        // Lo recuperiamo dal payload del DragState
        const eventW = DragState.payload.w; 
        
        visualX = Math.max(SchedulerRow.headerWidth, visualX);
        visualX = Math.min(1 - eventW, visualX);

        // --- 2. Conversione in Date ---
        const newStart = this.calculateDateFromVisualX(visualX);
        const duration = DragState.payload.durationMs;
        const newEnd = new Date(newStart.getTime() + duration);

        // --- 3. Formattazione Testo ---
        // Assumo tu abbia timeFormatter2Digit disponibile globalmente o importato
        const timeLabel = `${timeFormatter2Digit.format(newStart)} - ${timeFormatter2Digit.format(newEnd)}`;

        // --- 4. Aggiornamento Visivo del Ghost ---
        // Passiamo le coordinate assolute (screen/client) per il posizionamento fixed
        DragState.updateGhost(timeLabel, e.clientX, e.clientY);
    }

    /**
     * Handles EventCell drop into SchedulerRow.element
     * 1. releases original EventCell
     * 2. calculates new coordinates and new dates
     * 3. creates a copy of dropped EventCell with updated infoes into the new parent
     */
    onDrop = (e) => {
        e.preventDefault();
        this.element.classList.remove('bg-gray-50');

        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        const data = JSON.parse(rawData);

        // Old EvenCell removal
        const sourceRow = ROW_REGISTRY.get(data.sourceRowId);
        let removed = false;

        if (sourceRow) {
            removed = sourceRow.removeEventById(data.id);
        } 
        
        // Emergency removal
        if (!removed) {
            const oldDomElement = document.querySelector(`[data-id="${data.id}"]`);
            if (oldDomElement) {
                oldDomElement.remove();
                console.warn(`Event ${data.id} removed via DOM fallback (Logic removal failed).`);
            }
        }

        // Visual X calculation for drop (0.0 - 1.0)
        const rect = this.element.getBoundingClientRect();
        const dropX = e.clientX - rect.left;
        const elementLeftPx = dropX - (data.grabOffset || 0);

        let visualX = elementLeftPx / rect.width;
        // visualX normalization
        visualX = Math.max(SchedulerRow.headerWidth, visualX); // Do not exit form left
        visualX = Math.min(1 - data.w, visualX); // Do not exit from right

        // Convertion into new start
        const newStart = this.calculateDateFromVisualX(visualX);
        
        // New end calculation 
        // Note: Default duration is 1 hour
        const duration = data.durationMs || 3600000; 
        const newEnd = new Date(newStart.getTime() + duration);

        // New x and w from start and end
        const { x, w } = this.calculateGeometryFromDates(newStart, newEnd);

        const movedEvent = new EventCell({
            id: data.id,
            x: x,
            w: w,
            y: 0,
            start: newStart,
            end: newEnd,
            tagId: data.tagId,
            title: data.title,
            details: data.details,
            dayIndex : this.id
        })

        this.appendEvent(movedEvent);
    }

    /**
     * Callback on resize ending of EventCell.element.
     * Called by CelleEvent.handleResizeEnd
     */
    onEventResize = (e) => {
        const { id, x, w } = e.detail;
        console.log(`Event ${id} resized. New X: ${x}, New W: ${w}`);
        // TODO: decide if update DB here or EventCell side?
    }


}

class HeaderRow extends SchedulerRow {
    constructor(params) {
        super({
            ...params,
            classes : 
            `header-row
            !min-h-[40px]
            !border-b-0
            ${params.classes || ''}`,
            isDroppable : false
        })
    }
}