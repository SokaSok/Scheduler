class SchedulerRow {
    constructor({
        width,
        id,
        dayIndex,
        classes,
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
        relative
        flex
        flex-row
        min-h-[80px]
        border-b-1
        border-[color:var(--bd-snd)]
        scheduler-row
        ${classes}`;
        this.render()
        
        this.child = []
        this.events = []

        // Configurazioni per il drag & drop
        if (this.isDroppable) {
            this.element.addEventListener('dragover', this.onDragOver);
            this.element.addEventListener('drop', this.onDrop);
            this.element.addEventListener('dragleave', () => {
                this.element.classList.remove('bg-gray-50');
            });
            // Listener per il resize (bubbling dall'EventCell)
            this.element.addEventListener('event-resize', this.onEventResize);
        }

    }

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

    append(cell) {
        this.child.push(cell)
        this.element.appendChild(cell.element)
    }

    appendEvent(eventCell) {
        this.events.push(eventCell);
        this.element.appendChild(eventCell.element);
    }
    
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

    // --- LOGICA DI PROIEZIONE (Tempo -> Spazio) ---
    
    /**
     * Converte una Data in coordinate X e W (Percentuali 0-1)
     */
    calculateGeometryFromDates(eventStart, eventEnd) {
        const startMs = eventStart.getTime();
        const endMs = eventEnd.getTime();
        const durationMs = endMs - startMs;

        // 1. Calcola la percentuale temporale pura (0.0 = inizio giornata, 1.0 = fine giornata)
        const timeRatioStart = (startMs - this.start.getTime()) / this.totalDuration;
        const timeRatioDuration = durationMs / this.totalDuration;

        // 2. Calcola lo spazio disponibile per il tempo (100% - Header)
        const availableSpace = 1 - SchedulerRow.headerWidth;

        // 3. Proietta nello spazio visivo
        // X = Header + (RatioTempo * SpazioDisponibile)
        const x = SchedulerRow.headerWidth + (timeRatioStart * availableSpace);
        
        // W = RatioDurata * SpazioDisponibile
        const w = timeRatioDuration * availableSpace;

        return { x, w };
    }

    /**
     * Converte una coordinata X visuale in una Data
     */
    calculateDateFromVisualX(visualXPct) {
        const availableSpace = 1 - SchedulerRow.headerWidth;
        
        // 1. Rimuovi l'offset dell'header
        let timeAreaX = visualXPct - SchedulerRow.headerWidth;
        
        // 2. Normalizza (se x < 0 siamo nell'header, lo forziamo a 0)
        timeAreaX = Math.max(0, timeAreaX);
        
        // 3. Calcola il ratio temporale
        const timeRatio = Math.min(1, timeAreaX / availableSpace); // Clamp a 1 max

        // 4. Converti in ms
        const ms = this.start.getTime() + (timeRatio * this.totalDuration);
        return new Date(ms);
    }

    /**
     * Questo è il metodo che passeremo alle TimeCell
     * @param {Date} date - La data calcolata dalla cella
     * @param {Object} cellContext - Altre info utili dalla cella (es. rect, dayIndex)
     */
    onTimeCellClick = (date, cellContext) => {
        const durationMs = 3600000; 
        const eventEnd = new Date(date.getTime() + durationMs);
        const { x, w } = this.calculateGeometryFromDates(date, eventEnd);
        
        // Durata evento default: 1 ora
        console.log(App.tagTable.values[0].id)

        const newEvent = new EventCell({
            id: `evt-${Date.now()}`,
            x: x,
            w: w,
            y: 0,
            start: date,
            end: eventEnd,
            tagId: App.tagTable.values[0].id,
            title: 'New Event',
            isDraggable: true
        });


        this.append(newEvent);
    }

    
    onDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.element.classList.add('bg-gray-50');
    }

    /**
     * Gestisce il rilascio dell'evento (Spostamento)
     */
    onDrop = (e) => {
        e.preventDefault();
        this.element.classList.remove('bg-gray-50');

        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        const data = JSON.parse(rawData);

        // Rimuovi vecchio elemento
        const sourceRow = ROW_REGISTRY.get(data.sourceRowId);

        if (sourceRow) {
            // Rimuoviamo correttamente l'evento dalla memoria e dal DOM della vecchia riga
            sourceRow.removeEventById(data.id);
        } else {
            // Fallback di emergenza se non troviamo la riga nel registro (es. rimozione manuale DOM)
            const oldDomElement = document.querySelector(`[data-id="${data.id}"]`);
            if (oldDomElement) oldDomElement.remove();
        }

        // 1. Calcola posizione X visuale del drop (0.0 - 1.0)
        const rect = this.element.getBoundingClientRect();
        const dropX = e.clientX - rect.left;
        const elementLeftPx = dropX - (data.grabOffset || 0);

        let visualX = elementLeftPx / rect.width;
        // Assicuriamoci che l'evento non finisca dentro l'Header o fuori a destra
        // Nota: static HEADER_WIDTH_PCT è il tuo 0.05
        visualX = Math.max(SchedulerRow.headerWidth, visualX); // Non andare a sinistra dell'header
        visualX = Math.min(1 - data.w, visualX); // Non uscire a destra

        // 2. Converti la X visuale in Data di Inizio
        const newStart = this.calculateDateFromVisualX(visualX);
        
        // 3. Calcola la Data di Fine usando la durata originale dell'evento trascinato
        // (Se non hai durationMs nel data transfer, calcolalo da data.w usando la formula inversa)
        const duration = data.durationMs || 3600000; 
        const newEnd = new Date(newStart.getTime() + duration);

        // 4. Ricalcola X e W precisi basati sulle date
        // Questo passaggio è fondamentale: "Snap to Grid" implicito e correzione errori di arrotondamento
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
            details: data.details
        });

        this.appendEvent(movedEvent);
    }

    /**
     * Callback chiamata quando un evento finisce di essere ridimensionato
     */
    onEventResize = (e) => {
        const { id, x, w } = e.detail;
        console.log(`Event ${id} resized. New X: ${x}, New W: ${w}`);
        // Qui aggiorneresti il database o lo state globale
    }


}

class HeaderRow extends SchedulerRow {
    constructor(params) {
        super({
            ...params,
            classes : 
            `!min-h-[40px]
            !border-b-0`,
            isDroppable : false
        })
    }
}