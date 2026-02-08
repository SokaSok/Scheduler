const schedulerContainer = document.getElementById('scheduler-view')
const bodyContainer = document.getElementById('scheduler-body-container');
const headerContainer = document.getElementById('scheduler-header-container');

const ROW_REGISTRY = new Map();
const SNAP_MINUTES = 10;
const SNAP_MS = SNAP_MINUTES * 60 * 1000;

/**
 * Rounds date to nearest grid step
 * @param {Date} date 
 * @returns {Date}
 */
function snapDateToGrid(date) {
    const ms = date.getTime();
    const snappedMs = Math.round(ms / SNAP_MS) * SNAP_MS;
    return new Date(snappedMs);
}

/**
 * Verifica se due range temporali si sovrappongono
 */
function checkOverlap(startA, endA, startB, endB) {
    return (startA < endB) && (endA > startB);
}

/**
 * Returns colors calcolated per a specific Tag ID.
 * @param {string} tagId 
 * @returns {{ bg: string, border: string, text: string }}
 */
function getTagColors(tagId) {
    // Default fallback (Blue style)
    const fallback = {
        bg: '#dbeafe',       // blue-100
        border: '#3b82f6',   // blue-500
        text: '#1d4ed8'      // blue-700
    };

    if (!tagId || typeof App === 'undefined' || !App.tagTable) {
        return fallback;
    }

    const tag = App.tagTable.values.find(t => t.id === tagId) || App.tagTable.values[0];

    if (!tag) return fallback;

    return {
        bg: `hsl(${tag.h}, ${tag.bg_s}%, ${tag.bg_l}%)`,
        border: `hsl(${tag.h}, ${tag.border_s}%, ${tag.border_l}%)`,
        text: `hsl(${tag.h}, 50%, ${tag.text_l}%)`
    };
}

// --- APP LOGIC ---

const APP_STATE = {
    start   : mock_start,
    end     : mock_end,
    step    : mock_step,
    cols    : undefined,
    days    : Days,
    tags    : mock_tags,
    events  : [
        /* { id: 'e1', day: 0, colIndex: 0, colspan: 1, title: 'Meeting', tagId: 't1', details: '' } */
    ],
    editor: null
};

const App = {
    init() {
       this.calculateColumns();
        this.initSidebar();
        this.initScheduler();
        this.initResizers();
        this.initEditor();
        this.renderAll();
    },

    rows : [],

    calculateColumns() {
        const {start,end} = getStartEndFromString(APP_STATE)
        const {step} = APP_STATE
        const totalHours = (end - start) / (step*1000*60)

        APP_STATE.cols = []

        for (let i = 0; i < totalHours; i++) {
            const millisimatedStep = step * 60 * 1000
            const increment = i * millisimatedStep
            const incrementedStart = new Date(start.getTime() + increment)
            const incrementedEnd = new Date(new Date(incrementedStart).setMilliseconds(step*59*1000)) 
 
            APP_STATE.cols.push({
                start: incrementedStart,
                end : incrementedEnd
            })
        }


    },

    initEditor() {
        APP_STATE.editor = new toastui.Editor({
            el: document.querySelector('#editor-container'),
            height: '300px',
            initialEditType: 'markdown',
            previewStyle: 'vertical'
        });
    },

    // --- SIDEBAR (TAGS) ---
    initSidebar() {
        this.tagTable = new Table({
            first_column_is_checkbox : true,
            parent_element: document.getElementById('tags-table-container'),
            headers: [
                { '': '' },
                { 'Emoji': 'emoji' },
                { 'Nome': 'name' },
                { 'Padre': 'parent-select' },
                { 'Color': 'color-input' },
            ],
            values: [...APP_STATE.tags],
            properties: { '--width': ['40px', '50px', 'auto', '80px', '60px'] },
            f_object_formatter: ((key, obj, container) => {
                if (key === 'color-input') {
                    let input = createEl('input', {
                        attributes: { type: 'color', value: hslToHex(obj.h, 100, 50) },
                        classes: 'w-6 h-6 p-0 border-0 rounded cursor-pointer',
                        triggers: {
                            change: (e) => {
                                const hsl = hexToHsl(e.target.value);
                                obj.h = hsl.h;
                                // Auto-generate harmonies
                                obj.bg_s = 85; obj.bg_l = 92;
                                obj.border_s = 70; obj.border_l = 40;
                                obj.text_l = 20;
                                this.renderAll();
                            }
                        }
                    });
                    container.style.overflow = 'hidden';
                    container.appendChild(input);
                } else if (key === 'name') {
                    let input = createEl('input', {
                        attributes: { value: obj.name },
                        classes: 'w-full bg-transparent border-none outline-none text-sm font-bold',
                        triggers: { change: ((e) => { 
                            obj.name = e.target.value; 
                            this.renderAll(); 
                        }).bind(this) }
                    });
                    container.appendChild(input);
                } else if (key === 'emoji') {
                    let input = createEl('input', {
                        attributes: { value: obj.emoji },
                        classes: 'w-full bg-transparent border-none outline-none text-center',
                        triggers: { change: (e) => { obj.emoji = e.target.value; this.renderScheduler(); } }
                    });
                    container.appendChild(input);
                } else if (key === 'parent-select') {
                    let sel = createEl('select', { classes: 'w-full text-xs bg-transparent' });
                    sel.add(new Option('-', ''));
                    (this.tagTable?.values || APP_STATE.tags)
                    .filter(t => t.id !== obj.id && t.parent !== obj.id).forEach(t => {
                        sel.add(new Option(t.name, t.id));
                    });
                    sel.value = obj.parent || '';
                    sel.addEventListener('change', (e) => { 
                        obj.parent = e.target.value || null;
                        // Inherit logic could go here
                        this.renderAll(); 
                    });
                    container.appendChild(sel);
                }
                return container;
            }).bind(this)
        });
    },

    // --- SCHEDULER RENDERER ---
    initScheduler() {
        // Drag & Drop logic placeholder
    },

    renderAll() {
        this.tagTable.refresh();
        this.renderScheduler();
    },

    renderScheduler_old() {
        const headerRow = document.getElementById('scheduler-header-row');
        const bodyContainer = document.getElementById('scheduler-body-container');
        
        // Clear
        headerRow.innerHTML = '<div class="day-header">Giorno</div>';
        bodyContainer.innerHTML = '';

        // Render Header
        APP_STATE.cols.forEach((col, idx) => {
            let th = createEl('div', {
                classes: 'time-header-cell',
                innerText: `${col.start} - ${col.end}`,
                triggers: { click: () => this.openColumnModal(idx) }
            });

            headerRow.appendChild(th);
        });

        // Render Body Rows
        const {cols, days} = APP_STATE
        days.forEach((dayName, dayIndex) => {
            let row = createEl('div', { classes: 'scheduler-row' });
            
            // Day Label
            row.appendChild(createEl('div', { classes: 'day-header', innerText: dayName }));

            // Cells
            let colIndex = 0;
            while (colIndex < cols.length) {
                const currentColIndex = colIndex;
                const evt = APP_STATE.events.find(e => e.day === dayIndex && e.colIndex === currentColIndex);
                if (evt) {
                    // Event Cell
                    let cell = this.createEventCell(evt);
                    // Apply colspan
                    let span = evt.colspan || 1;
                    cell.style.width = `${(span / cols.length) * 100}%`; // Approximation
                    row.appendChild(cell);
                    colIndex += span;
                } else {
                    // Empty Cell
                    let cell = createEl('div', {
                        classes: `event-cell hover:bg-gray-50 w-[${1 / cols.length * 100}%]`,
                        innerText : `row: ${dayIndex}, col: ${currentColIndex}`,
                        triggers: {
                            click: (() => this.createEvent(dayIndex, currentColIndex)).bind(this),
                            dragover: (e) => e.preventDefault(),
                            drop: ((e) => this.handleDrop(e, dayIndex, currentColIndex)).bind(this)
                        }
                    });
                    row.appendChild(cell);
                    colIndex++;
                }
            }
            bodyContainer.appendChild(row);
        });
    },

    renderScheduler() {
        // Clear
        for (let i = this.rows.length-1; i >= 0; i--) {
            this.rows[i].delete()
            this.rows.splice(i,1)
        }

        const {cols, days, step} = APP_STATE
        const colWidth = (cols.length+1) * step * 2

 
        const headerRow = new HeaderRow({ 
            width : colWidth, 
            id : 'scheduler-header-row',
            start : APP_STATE.start,
            end : APP_STATE.end,
        })
        headerContainer.appendChild(headerRow.element)
        ROW_REGISTRY.set(headerRow.id, headerRow);
        headerRow.append(new RowHeaderCell({ label : 'Giorno' }))
        
        // Render Body Rows
        days.forEach((dayName, dayIndex) => {
            


            let row = new SchedulerRow({
                width :  colWidth, 
                dayIndex, 
                id : dayIndex,
                start : APP_STATE.start,
                end : APP_STATE.end
            })
            ROW_REGISTRY.set(row.id,row)
            
            // Day Label
            row.append(new RowHeaderCell({label :  dayName}));

            // Cells
            let colIndex = 0;
            while (colIndex < cols.length) {
                const currentColIndex = colIndex;
                const {start, end} = cols[colIndex]
                // Render Header
                if (!dayIndex) {
                    const colHeader = new ColHeaderCell({
                        w : 1 / cols.length,
                        start,
                        end,
                        x : colIndex / cols.length,
                        onClick : (_ => this.openColumnModal(colIndex)).bind(this)
                    })
                    headerRow.append(colHeader)
                }

                let cell = new TimeCell({
                    width : colWidth,
                    dayIndex,
                    start,
                    end,
                    onClick : row.onTimeCellClick,
                    onDragOver : (e) => e.preventDefault(),
                    onDrop : ((e) => this.handleDrop(e, dayIndex, currentColIndex)).bind(this)
                })

                row.append(cell);

                colIndex++;

            }
            bodyContainer.appendChild(row.element);
        });
    },

    createEventCell(evt) {
        const tag = App.tagTable.values.find(t => t.id === evt.tagId) || App.tagTable.values[0];
        
        // Color Logic
        let parentTag = tag.parent ? App.tagTable.values.find(t => t.id === tag.parent) : null;
        let baseTag = parentTag || tag; // Use parent for borders if exists
        
        let hue = tag.h;
        let bg = `hsl(${hue}, ${tag.bg_s}%, ${tag.bg_l}%)`;
        let border = `hsl(${baseTag.h}, ${baseTag.border_s}%, ${baseTag.border_l}%)`;
        let text = `hsl(${hue}, 50%, ${tag.text_l}%)`;

        let cell = createEl('div', {
            classes: 'event-cell flex flex-col gap-1 cursor-pointer group',
            attributes: { draggable: 'true', 'data-id': evt.id },
            properties: {
                'background-color': bg,
                'border-left': `4px solid ${border}`,
                'color': text
            },
            triggers: {
                dblclick: (() => this.openEventModal(evt.id)).bind(this),
                dragstart: (e) => {
                    e.dataTransfer.setData('text/plain', evt.id);
                    e.target.classList.add('dragging');
                },
                dragend: (e) => e.target.classList.remove('dragging')
            }
        });

        // Title Textarea (Auto-save on enter/blur)
        let titleInput = createEl('textarea', {
            classes: 'w-full bg-transparent resize-none outline-none text-xs font-semibold overflow-hidden leading-tight flex-1',
            attributes: { rows: 1 },
            innerText: evt.title || '',
            triggers: {
                change: (e) => { evt.title = e.target.value; },
                click: (e) => e.stopPropagation() // Prevent triggering parent click
            }
        });

        // Tag Selector (Custom)
        let tagWrapper = createEl('div', { classes: 'custom-select-wrapper mt-auto' });
        let tagDisplay = createEl('div', {
            classes: 'flex items-center gap-1 text-[10px] opacity-70 hover:opacity-100 transition',
            innerHTML: `<span>${tag.emoji}</span> <span>${tag.name}</span>`
        });
        
        // Dropdown logic for tags
        let tagList = createEl('div', { classes: 'custom-select-list' });
        // Add tag options...
        // (Simplified for brevity: in production, render full list with "Create New")
        App.tagTable.values.forEach(t => {
            let item = createEl('div', {
                classes: 'custom-select-item text-xs',
                innerHTML: `${t.emoji} ${t.name}`,
                triggers: {
                    click: (e) => {
                        e.stopPropagation();
                        evt.tagId = t.id;
                        this.renderScheduler();
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
                            evt.tagId = newTag.id;
                            this.renderAll();
                        }
                    }
                }
        });
        tagList.appendChild(newTagInput);

        tagWrapper.appendChild(tagDisplay);
        tagWrapper.appendChild(tagList);
        
        tagDisplay.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-list').forEach(l => l !== tagList && l.classList.remove('open'));
            tagList.classList.toggle('open');
        });

        cell.appendChild(titleInput);
        cell.appendChild(tagWrapper);

        return cell;
    },

    // --- EVENT ACTIONS ---
    createEvent(dayIndex, e) {
        console.log(e)
        return
        const newEvt = {
            id: 'e' + Date.now(),
            day: dayIndex,
            colIndex: colIndex,
            colspan: 1,
            title: '',
            tagId: App.tagTable.values[0].id,
            details: ''
        };
        APP_STATE.events.push(newEvt);
        this.renderScheduler();
    },

    handleDrop(e, day, col) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const evt = APP_STATE.events.find(e => e.id === id);
        if (evt) {
            evt.day = day;
            evt.colIndex = col;
            // Check bounds
            if (evt.colIndex + evt.colspan > APP_STATE.cols.length) {
                evt.colspan = APP_STATE.cols.length - evt.colIndex;
            }
            this.renderScheduler();
        }
    },

    // --- MODALS ---
    openColumnModal(index) {
        const col = APP_STATE.cols[index];
        document.getElementById('col-edit-index').value = index;
        document.getElementById('col-start').value = getTimeToString(col.start)
        document.getElementById('col-end').value = getTimeToString(col.end)
        document.getElementById('col-conflict-area').classList.remove('hidden'); // Always show options for now
        document.getElementById('modal-column').classList.remove('hidden');
    },

    saveColumnEdit() {
        const index = parseInt(document.getElementById('col-edit-index').value);
        const start = document.getElementById('col-start').value;
        const end = document.getElementById('col-end').value;
        const mode = document.querySelector('input[name="col_mode"]:checked').value;
        
        // TODO: fix to make coherent with HeaderCell
        if (mode === 'adjust') {
            APP_STATE.cols[index].start = start;
            APP_STATE.cols[index].end = end;
        } else {
            // Shift logic: simple implementation
            APP_STATE.cols[index].start = start;
            APP_STATE.cols[index].end = end;
            // Logic to insert gap would go here (complex)
        }
        closeModal('modal-column');
        this.renderScheduler();
    },

    deleteColumn() {
        const index = parseInt(document.getElementById('col-edit-index').value);
        if(confirm("Rimuovere colonna? Eventi contenuti verranno eliminati.")) {
            APP_STATE.cols.splice(index, 1);
            APP_STATE.events = APP_STATE.events.filter(e => e.colIndex !== index);
            // Adjust indices
            APP_STATE.events.forEach(e => {
                if (e.colIndex > index) e.colIndex--;
            });
            closeModal('modal-column');
            this.renderScheduler();
        }
    },

    openEventModal(id) {
        const evt = APP_STATE.events.find(e => e.id === id);
        if (!evt) return;
        
        document.getElementById('evt-id').value = evt.id;
        document.getElementById('evt-title').value = evt.title;
        
        const time = `${APP_STATE.days[evt.day]} ${APP_STATE.cols[evt.colIndex].start} - ${APP_STATE.cols[evt.colIndex + (evt.colspan-1)].end}`;
        document.getElementById('evt-time-display').innerText = time;

        // Populate Tag Select
        const sel = document.getElementById('evt-tag-select');
        sel.innerHTML = '';
        App.tagTable.values.forEach(t => sel.add(new Option(`${t.emoji} ${t.name}`, t.id)));
        sel.value = evt.tagId;

        APP_STATE.editor.setMarkdown(evt.details || '');
        
        document.getElementById('modal-event').classList.remove('hidden');
    },

    saveEventDetails() {
        const id = document.getElementById('evt-id').value;
        const evt = APP_STATE.events.find(e => e.id === id);
        if (evt) {
            evt.title = document.getElementById('evt-title').value;
            evt.tagId = document.getElementById('evt-tag-select').value;
            evt.details = APP_STATE.editor.getMarkdown();
        }
        closeModal('modal-event');
        this.renderScheduler();
    },

    deleteEvent() {
        const id = document.getElementById('evt-id').value;
        APP_STATE.events = APP_STATE.events.filter(e => e.id !== id);
        closeModal('modal-event');
        this.renderScheduler();
    },

    // --- DATA MGMT ---
    exportJson() {
        const data = JSON.stringify(APP_STATE, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schedule.json';
        a.click();
    },

    importFile(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                Object.assign(APP_STATE, json);
                this.renderAll();
                alert("Importazione riuscita!");
            } catch(err) {
                alert("Errore file JSON");
            }
        };
        reader.readAsText(file);
    },

    initResizers() {
        // Sidebar Resize
        const resizer = document.getElementById('sidebar-resizer');
        const sidebar = document.getElementById('sidebar');
        let x = 0;
        let w = 0;
        const md = (e) => { x = e.clientX; w = sidebar.getBoundingClientRect().width; document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu); }
        const mm = (e) => { const dx = e.clientX - x; sidebar.style.width = `${w + dx}px`; }
        const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); }
        resizer.addEventListener('mousedown', md);

        // Burger
        document.getElementById('burger-btn').addEventListener('click', () => {
            const sb = document.getElementById('sidebar');
            if (sb.style.display === 'none') sb.style.display = 'flex';
            else sb.style.display = 'none';
        });
    }
};

// --- UTILS ---
function promptAddColumn() {
    const last = APP_STATE.cols[APP_STATE.cols.length - 1];
    let start = last ? last.end : "08:00";
    // Simple logic to add hour
    let [h, m] = start.split(':').map(Number);
    let nextH = h + 1;
    let end = `${nextH.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
    APP_STATE.cols.push({ start, end });
    App.renderScheduler();
}

function addNewTag() {
    App.tagTable.values.push({ id: 't'+Date.now(), name: 'Nuovo', emoji: '🏷️', h: 200, bg_s: 90, bg_l: 90, border_s: 70, border_l: 40, text_l: 20 });
    App.renderAll();
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// Close Selects on outside click
window.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-list').forEach(l => l.classList.remove('open'));
});

// INIT
window.app = App;
App.init();
