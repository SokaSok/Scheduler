/**
 * @typedef {Object} CellParams
 * @property {Function?} onClick     - Click trigger
 * @property {Function?} onDragOver  - Drag over trigger
 * @property {Function?} onDrop      - Drop trigger
 * @property {number?}   x           - Left position (percentage: 0 to 1)
 * @property {number?}   y           - Top position (percentage: 0 to 1). Default = 0
 * @property {number}    w           - Width (percentage: 0 to 1)
 * @property {number?}   h           - Height (percentage: 0 to 1). Default = 1
 * @property {string?}   classes     - Additional classes for rendering
 * @property {Date}      start       - Starting time of date range rapresented by cell
 * @property {Date}      end         - Ending time of date range rapresented by cell
 * @property {string?}   id
 * @property {boolean?}  isDraggable
 */

/**
 * @typedef {Object} HeaderCellParams
 * @property {Function?}    onClick - Click trigger
 * @property {number}       w       - Width (percentage: 0 to 1)
 */

/**
 * @typedef {HeaderCellParams & {
 *  start : Date,
 *  end : Date,
 * }} HColCellParams
 * @description 
 *  - start: Starting time of date range rapresented by cell
 *  - end: Ending time of date range rapresented by cell
 */

/**
 * @typedef {HeaderCellParams & {
 *  label : string,
 * }} HRowCellParams
 */

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



class Cell {
    /**
     * @param {CellParams} param0 
     */
    constructor({
        onClick = undefined,
        onDragOver = undefined,
        onDrop = undefined,
        x,
        y = 0,
        w,
        h = 1,
        classes = '',
        start,
        end,
        isDraggable = false,
        id = undefined
    }) {
        this.onClick = onClick;
        this.onDragOver = onDragOver
        this.onDrop = onDrop
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.classes = classes
        this.start = start
        this.end = end
        this.id = id
        this.isDraggable = isDraggable
        this.render()
    }

    render() {
        // Calcolo stili inline per la geometria
        const geometryStyle = {
            left: this.x !== undefined ? `${this.x * 100}%` : 'auto',
            top: `${this.y * 100}%`,
            width: `${this.w * 100}%`,
            height: `${this.h * 100}%`,
        };

        this.element = createEl('div', {
            classes : this.classes,
            properties : geometryStyle,
            triggers : {
                click : this.onClick,
                dragover : this.onDragOver,
                drop : this.onDrop
            },
            attributes : {
                'data-id' : this.id,
                draggable : this.isDraggable
            }
        })
    }

    delete() {
        this.element.remove()
    }
}

class TimeCell extends Cell {
    /**
     * 
     * @param {CellParams & { dayIndex : string }} params 
     */
    constructor(params) {
        super({
            ...params,
            classes : 
            `time-cell
            hover:bg-gray-50
            border-r-[1px]
            border-dashed
            border-[var(--bd-snd)]
            min-w-0
            grow
            cursor-copy
            `,
            onClick : undefined
        })
        this.dayIndex = params.dayIndex
        this.parentClickHandler = params.onClick;

       
        this.element.addEventListener('click', this.handleLocalClick);
    }

    handleLocalClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = this.element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        
        // Calcolo Data
        const { start, end } = this;
        const ratio = Math.min(1, Math.max(0, x / width));
        const clickedMs = start.getTime() + ratio * (end.getTime() - start.getTime());
        const date = new Date(clickedMs);

        if (this.parentClickHandler) {
            this.parentClickHandler(date, {
                x,
                domRect: rect // Utile se vuoi far apparire un popup esattamente lì
            });
        }
    }
}

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
            ${params.classes || ''}
            `,
            y : 0,
            isDraggable : true
        })
        this.tagId = params.tagId
        this.title = params.title
        this.details = params.details
        this.updateColors()
        this.addElements()

        this.renderResizeHandles();
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
             // Fallback visivo
             this.element.classList.add('bg-blue-100', 'border-blue-500', 'text-blue-700');
        }
    }

    addElements() {
        this.addTime()
        this.addTitle()
        this.addDetails()
        this.addTagSelector()
    }

    getTime(start = this.start, end = this.end) {
        return `${timeFormatter2Digit.format(start)} - ${timeFormatter2Digit.format(end)}`;
    }

    updateTime(start, end) {
        const time = this.getTime(start, end)
        const textSpan = this.element.querySelector('.time');
        textSpan.textContent = time
        this.element.setAttribute('time', txt);
    }

    addTime() {
        let titleInput = createEl('span', {
            classes: 
            `time
            w-full flex-1
            p-1
            bg-transparent 
            text-xs`,
            attributes: { rows: 1 },
            innerText: this.getTime()
        });
        this.element.appendChild(titleInput)
    }

    addTitle() {
        let titleInput = createEl('textarea', {
            classes: 
            `w-full flex-1
            p-2
            bg-transparent 
            resize-none outline-none overflow-hidden 
            text-sm font-semibold leading-tight`,
            attributes: { rows: 1 },
            innerText: this.title || '',
            triggers: {
                change: (e) => { this.title = e.target.value; },
                click: (e) => e.stopPropagation() // Prevent triggering parent click
            }
        });
        this.element.appendChild(titleInput)
    }

    addDetails() {
        // TODO: add details container
    }

    addTagSelector() {
        console.log(this.tagId)
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
            classes: 'w-full border-t p-1 text-xs outline-none',
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
                        // TODO: render all events and tag table
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



    renderResizeHandles() {
        const handleClass = "absolute top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 z-30 transition-colors";
        
        // Handle Sinistro (Start)
        this.leftHandle = createEl('div', { classes: `${handleClass} left-0` });
        this.leftHandle.addEventListener('mousedown', (e) => this.initResize(e, 'left'));
        
        // Handle Destro (End)
        this.rightHandle = createEl('div', { classes: `${handleClass} right-0` });
        this.rightHandle.addEventListener('mousedown', (e) => this.initResize(e, 'right'));

        this.element.appendChild(this.leftHandle);
        this.element.appendChild(this.rightHandle);
    }

// --- LOGICA SPOSTAMENTO (Drag & Drop API) ---

    handleDragStart = (e) => {
        e.dataTransfer.effectAllowed = 'move';
        const rect = this.element.getBoundingClientRect();
        const grabOffset = e.clientX - rect.left;

        const payload = JSON.stringify({
            id: this.id,
            sourceRowId: this.id,
            w: this.w,
            durationMs: this.end.getTime() - this.start.getTime(),
            tagId: this.tagId,
            title: this.title,
            details: this.details,
            startOffsetMs: this.start.getTime(),
            grabOffset
        });
        e.dataTransfer.setData('application/json', payload);
        
        // Opzionale: Nascondi leggermente l'elemento originale mentre trascini
        setTimeout(() => this.element.classList.add('opacity-50'), 0);
    }

    // --- LOGICA RIDIMENSIONAMENTO (Mouse Events) ---

    initResize(e, side) {
        e.preventDefault();
        e.stopPropagation(); // Impedisce che parta il drag dell'elemento padre

        this.isResizing = true;
        this.resizeSide = side;
        this.initialX = e.clientX;
        
        // Dati geometrici iniziali
        const rect = this.element.getBoundingClientRect();
        const parentRect = this.element.parentElement.getBoundingClientRect();
        
        this.startState = {
            left: this.element.offsetLeft,
            width: rect.width,
            parentWidth: parentRect.width
        };

        // Listener globali (così funziona anche se il mouse esce dalla cella)
        window.addEventListener('mousemove', this.handleResizeMove);
        window.addEventListener('mouseup', this.handleResizeEnd);
    }


    //TODO: riprendere da qui -> https://gemini.google.com/app/25ceffa0b69b50af?utm_source=app_launcher&utm_medium=owned&utm_campaign=base_all
    // bug del drop: se elemento ridimensionato non ricorda dimensione
    handleResizeMove = (e) => {
        if (!this.isResizing) return;

        const deltaX = e.clientX - this.initialX;
        let newWidth, newLeft;

        if (this.resizeSide === 'right') {
            // Modifica solo la larghezza
            newWidth = Math.max(10, this.startState.width + deltaX); // Min 10px
            this.element.style.width = `${newWidth}px`;
            
            // Aggiorna this.w (percentuale) per consistenza
            this.w = newWidth / this.startState.parentWidth;
        } else {
            // Modifica left e larghezza (per mantenere il lato destro fisso)
            // Nota: deltaX positivo sposta a destra (riduce larghezza), negativo a sinistra (aumenta larghezza)
            newWidth = Math.max(10, this.startState.width - deltaX);
            newLeft = this.startState.left + deltaX;

            this.element.style.width = `${newWidth}px`;
            this.element.style.left = `${newLeft}px`;
            
            this.x = newLeft / this.startState.parentWidth;
            this.w = newWidth / this.startState.parentWidth;
        }
    }

    handleResizeEnd = (e) => {
        if (!this.isResizing) return;
        this.isResizing = false;

        window.removeEventListener('mousemove', this.handleResizeMove);
        window.removeEventListener('mouseup', this.handleResizeEnd);

        // QUI: Ricalcola le date start/end basandosi sulle nuove percentuali
        // e notifica il controller/row per salvare le modifiche persistenti.
        this.recalculateDatesFromGeometry();
        console.log("Resize Ended. New Range:", this.start, this.end);
    }

    recalculateDatesFromGeometry() {
        // Questa funzione dipende da come ottieni il range totale della riga.
        // Assumiamo che il genitore Row abbia data inizio e fine giornata/periodo.
        // Per ora emettiamo un evento custom che la Row ascolterà.
        const event = new CustomEvent('event-resize', {
            detail: { 
                id: this.id,
                x: this.x,
                w: this.w
            },
            bubbles: true
        });
        this.element.dispatchEvent(event);
    }
}

class ColHeaderCell extends Cell {
    /**
     * 
     * @param {HColCellParams} param0 
     */
    constructor({
        onClick = undefined,
        w = 1,
        start,
        end
    }) {
        super({
            w,
            y : 0,
            h : 1,
            onClick, 
            classes : 
            `time-header-cell
            sticky
            z-9
            flex
            justify-center
            items-center
            bg-[var(--bg-tbl-th-col)]
            font-bold
            `, 
            start, 
            end})
        this.updateLabel()
    }

    updateLabel() {
        const label = [this.start,this.end]
        .map(tm => timeFormatter2Digit.format(tm))
        .join(' - ')
        this.label = label
        this.element.textContent = this.label
    }
}

class RowHeaderCell extends Cell {
    /**
     * 
     * @param {HRowCellParams} param0 
     */
    constructor({
        onClick = undefined,
        label
    } = {}) {
        super({
            onClick, 
            x : 0,
            y : 0,
            w : SchedulerRow.headerWidth,
            h : 1,
            classes : 
            `day-header
            sticky
            z-10
            min-w-20
            flex
            shrink-0
            justify-center
            items-center
            border-r-2
            border-[var(--bd-trd)]
            bg-[var(--bg-tbl-th-col)]
            font-bold
            `})
        this.label = label
        this.updateLabel()
        return this
    }

    updateLabel() {
        this.element.textContent = this.label
    }
}