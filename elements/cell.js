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
 * @property {string?}   dayIndex    - Index of day associated to SchedeulerRow (same as its id)
 * @property {Date}      start       - Starting time of date range rapresented by cell
 * @property {Date}      end         - Ending time of date range rapresented by cell
 * @property {string?}   id
 * @property {boolean?}  isDraggable
 */

/**
 * @typedef {Object} HeaderCellParams
 * @property {Function?}    onClick - Click trigger
 * @property {number}       w       - Width (percentage: 0 to 1)
 * @property {string?}      classes - Additional classes for rendering
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
        dayIndex = undefined,
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
        this.dayIndex = dayIndex
        this.start = start
        this.end = end
        this.id = id
        this.isDraggable = isDraggable
        this.render()
    }

    render() {
        // Styles calculation for geometry
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

/**
 * Empty cell with thees purposes:
 * - Showing time range into SchedulerRow
 * - Triggering new EventCell creation
 */
class TimeCell extends Cell {
    /**
     * @param {CellParams & { dayIndex : string }} params 
     */
    constructor(params) {
        super({
            ...params,
            classes : 
            `time-cell
            hover:bg-gray-50 cursor-copy
            border-r-[1px] border-dashed border-[var(--bd-snd)]
            min-w-0 grow            
            ${params.classes || ''}`,
            onClick : undefined
        })
        this.dayIndex = params.dayIndex
        this.parentClickHandler = params.onClick;

       
        this.element.addEventListener('click', this.handleLocalClick);
    }

    /**
     * Calculate relative mouse click X coordinate and start 
     * and trigger parent SchedulerRow click handler to create new EventCell
     * @param {MouseEvent} e 
     */
    handleLocalClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = this.element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        
        // Times calculation
        const { start, end } = this;
        const ratio = Math.min(1, Math.max(0, x / width));
        const clickedMs = start.getTime() + ratio * (end.getTime() - start.getTime());
        const date = new Date(clickedMs);

        if (this.parentClickHandler) {
            this.parentClickHandler(date, {
                x,
                domRect: rect
            });
        }
    }
}



/**
 * Cell rapresenting column header (showing time range)
 */
class ColHeaderCell extends Cell {
    /**
     * 
     * @param {HColCellParams} param0 
     */
    constructor({
        onClick = undefined,
        w = 1,
        start,
        end,
        classes = ''
    }) {
        super({
            w,
            y : 0,
            h : 1,
            onClick, 
            classes : 
            `time-header-cell
            sticky z-9
            flex justify-center items-center
            bg-[var(--bg-tbl-th-col)] font-bold
            ${classes}`, 
            start, 
            end
        })
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

/**
 * Cell rapresenting row header (showing day name)
 */
class RowHeaderCell extends Cell {
    /**
     * 
     * @param {HRowCellParams} param0 
     */
    constructor({
        onClick = undefined,
        label,
        classes = ''
    } = {}) {
        super({
            onClick, 
            x : 0,
            y : 0,
            w : SchedulerRow.headerWidth,
            h : 1,
            classes : 
            `day-header
            sticky z-10 min-w-20 
            flex shrink-0 justify-center items-center
            border-r-2 border-[var(--bd-trd)]
            bg-[var(--bg-tbl-th-col)] font-bold
            ${classes}`
        })
        this.label = label
        this.updateLabel()
        return this
    }

    updateLabel() {
        this.element.textContent = this.label
    }
}