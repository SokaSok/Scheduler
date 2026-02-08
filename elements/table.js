class Table {
    /**
    * - values: 
    *   - lista o funzione ritornante lista con valori da visualizzare 
    *   - elementi devono avere le seguenti proprietà:
    *       1. id
    *       2. is_new (solo se nuovi inserimenti) 
    * - f_object_formatter: prende 3 parametri:
    *   1. key di object di cui inserire valore
    *   2. object
    *   3. elemento in cui inserire valore
    * - headers : array di oggetti composti come segue:
    *   - key: testo da visualizzare in header
    *   - value: nome della proprietà dell'oggetto da visualizzare
    * - first_column_is_radio: prima colonna con radio per selezione singola colonna. Comporta:
    *   1. radio_key: value associato a radio
    *   2. radio_name: name di gruppo dei radio della colonna
    * - select_handler: funzione da eseguire DOPO select_handler predefinito (se attivato)
    * @param {{
    *  headers : {header : string}[],
    *  classes : [string],
    *  title : [string],
    *  first_column_is_checkbox : [boolean],
    *  first_column_is_radio : [boolean],
    *  radio_key : [string],
    *  radio_name : [string],
    *  has_select_handler : [boolean],
    *  select_handler : [function],
    *  has_footer : [boolean],
    *  has_navigation_btns : [boolean],
    *  values : Object | function,
    *  max_elements : [number],
    *  f_object_formatter : [function]
    *  navigation_container : [HTMLElement]
    *  parent_element : HTMLElement,
    *  has_no_commit_icon : [boolean],
    *  no_commit_icon : [string],
    *  no_commit_msg : [string],
    *  is_editable : [boolean],
    *  is_calendar_table : [boolean],
    *  properties : [Object],
    *  onUpdate : [function]
    * }} param0 
    * @returns {HTMLElement}
    */
    constructor ({
        headers,
        title,
        classes = '',
        first_column_is_radio,
        radio_name,
        radio_key,
        first_column_is_checkbox,
        has_select_handler,
        select_handler,
        values = [],
        f_object_formatter,
        has_headers,
        has_footer,
        has_navigation_btns,
        max_elements = 25,
        navigation_container,
        parent_element,
        has_no_commit_icon = false,
        no_commit_msg = 'Nessun impegno',
        no_commit_icon = icone['no commitment'],
        is_calendar_table = false,
        is_editable = false,
        properties = {}, // { '--width' : [], '--order' : []} 
        onUpdate = null
    }) {
        if (!headers) return

        this.first_column_is_checkbox = first_column_is_checkbox
        this.first_column_is_radio = first_column_is_radio
        this.navigation_container = navigation_container
        this.table = createEl('div',{classes : 'table '+classes})
        this.values = values
        this.headers = headers
        this.f_object_formatter = f_object_formatter
        this.has_headers = has_headers !== undefined ? has_headers : true
        this.has_footer = has_footer
        this.has_navigation_btns = has_navigation_btns
        this.no_commit_icon = no_commit_icon
        this.no_commit_msg = no_commit_msg
        this.has_no_commit_icon = has_no_commit_icon
        this.radio_key = radio_key
        this.radio_name = radio_name
        this.title = title ? createEl('div',{classes : 'table_title', innerHTML : title}) : undefined
        this.has_select_handler = has_select_handler
        this.select_handler = select_handler
        this.is_calendar_table = is_calendar_table
        this.is_editable = is_editable
        this.max_elements = max_elements
        this.elements_index = 0

        // Inizializzazione edit mode
        this.is_editable = is_editable;
        this.onUpdate = onUpdate;
        // Parsing proprietà
        this.colWidths = properties['--width'] || [];
        this.colOrders = properties['--order'] || [];
        console.log(this)
        
        this.setup_table()
        this.show_elements()

        if (parent_element) {
            if (this.title) parent_element.append(this.title)
            parent_element.append(this.table)
        }

        // Timeout per applicare stili (ordine) dopo render
        if (this.is_editable) {
            this.injectStyles(); // Assicura che gli stili CSS per resize/drag siano presenti
            setTimeout(() => this.applyColumnStyles(), 0);
        }

        return this    
    }

    remove() {
        this.table.remove(); 
        this.navigation_container.querySelector('.navigation')?.remove(); 
        delete this
    }
    
    setup_table() {
        this.table.innerHTML = '' 
        const no_commitment = !(this.actual_elements || this.get_list()).length && this.has_no_commit_icon 
        if (no_commitment) this.table.append(this.show_no_commitment())
        if (!no_commitment || this.is_editable) {
            
            if (!this.colWidths || this.colWidths.length === 0) {
                this.colWidths = new Array(this.headers.length).fill('auto');
            }
            if (!this.colOrders || this.colOrders.length === 0) {
                this.colOrders = this.headers.map((_, i) => i);
            }

            let columns_container = createEl('div',{classes : 'columns_container'})
                
            this.headers.forEach((el,index) => {
                let key = typeof Object.values(el)[0] == 'string' ? Object.values(el)[0]?.replace('_',' ') : Object.values(el)[0]
                let txt = Object.keys(el)[0]?.replace('_',' ')
                
                // Stili inline per edit mode
                // let colStyles = {};
                // if (this.is_editable) {
                //     colStyles.width = this.colWidths[index] !== 'auto' ? this.colWidths[index] : null;
                //     colStyles.order = this.colOrders[index];
                //     colStyles.flex = this.colWidths[index] !== 'auto' ? `0 0 ${this.colWidths[index]}` : '1';
                // }
                
                let col = createEl('div',{
                    classes : 'column',
                    attributes : {'data-col' : key, 'data-pos' : index},
                    properties : {
                        '--width' : this.colWidths[index],
                        '--order' : this.colOrders[index],
                    }
                })
                
                if (this.has_headers) {
                    let cell = createEl('div', {
                        classes : 'cell header',
                        innerHTML: `<span>${txt}</span>`
                    })

                    // --- MODIFICA: Logica Edit Mode (Drag & Resize) ---
                    if (this.is_editable) {
                        cell.classList.add('draggable');
                        this.setupHeaderEditing(cell, col, index);
                    }

                    if (index == 0 && this.first_column_is_checkbox) {
                        let cb = createEl('input', {
                            attributes : {
                                type : 'checkbox'
                            },
                            triggers : {
                                change : ((e) => {
                                    const checked = e.target.checked;
                                    [...this.table.querySelectorAll('.cell.row_header input[type="checkbox"]')]
                                    .forEach(cb => {
                                        if (cb.checked != checked) cb.click()
                                    })
                                }).bind(this)
                            }
                        })
                        cell.querySelector('span').prepend(cb)
                    } 
                    col.appendChild(cell)
                }
                                
                columns_container.append(col)                     
            })
            this.table.append(columns_container)                     
        }
        let footer
        if (this.has_footer) {
            footer = createEl('div',{classes : 'footer'})
            this.table.appendChild(footer)
        }

        if (this.has_navigation_btns) {
            if (this.has_footer) this.navigation_container = footer
            if (this.navigation_container) this.add_navigation_btns()
        }
    
    }

    get_list() { return typeof this.values === 'function' ? this.values() : this.values}
    
    show_elements(not_update) {
        if (!not_update) this.actual_elements = this.get_list()

        this.setup_table()
        let list = this.actual_elements
        .filter((_,i) => !this.is_calendar_table ?  i >= this.elements_index && i < this.elements_index + this.max_elements : true)
        if (!list) return
        
        list.forEach((v,i) => {
            this.add_row({object : v, row_index : i})            
        })   
        if (this.navigation_container) this.update_nav_btns()
    }

    show_no_commitment() {
        return createEl('div', {
            classes : 'full_window',
            figli : [
                createEl('h2',{
                    innerText : this.no_commit_msg
                }),
                iconed_element('h1',this.no_commit_icon,{classes : 'background'})
            ]
        })
    }


    /**
    * 
    * @param {{
    *  keys : string[],
    *  object : Object,
    *  row_index : number
    * }} param0 
    * @returns 
    */
    add_row({object, row_index = 0}) {
       if (!object) return
       let cells = []
       this.headers.forEach((el,i) => {
           let key = Object.values(el)[0].trim()
           let col = this.table.querySelector(`[data-col="${key}"]`)
           let span = createEl('span');
           let has_row_header = this.first_column_is_checkbox || this.first_column_is_radio 
           if (!i && has_row_header) {
               let is_radio = this.first_column_is_radio
               let attributes = this.first_column_is_radio ?
                {
                    type : 'radio',
                    value : object[this.radio_key],
                    name : this.radio_name
                } : 
                {type : 'checkbox'}
                span = createEl('label')
                let input = span.appendChild(createEl('input',{
                    attributes,
                    triggers : { change : (e => {
                        this.select_row({target : e.target, is_radio})
                        if (this.select_handler) this.select_handler(e)
                    }).bind(this) }
                }))
                input.checked = object.selected
           }
           else if (this.f_object_formatter) span = this.f_object_formatter(key,object,span)
           else span.innerText = object[key]
           
           if (!this.is_calendar_table) {
               let r_cell = createEl('div', {
                   classes :  `cell ${(!i && has_row_header? 'row_header' : '')} ${(object.is_new ? 'new' : '')} ${(object.selected ? 'selected' : '')}`,
                   attributes : {
                        'data-delay' : row_index, 
                        'data-id' : object.id,
                        tabindex : -1
                    },
                    figli : [span]
               })
               col.appendChild(r_cell)
               r_cell.style.setProperty('--delay',row_index)
               r_cell.classList.add('show')
           } else {
                //span.setProperty('data-delay','???')
                col.append(span)
           }
           cells.push(span)
       })  
       return cells
   }

    add_navigation_btns() {
        let nav = 
            this.navigation_container.querySelector('.navigation') || 
            this.navigation_container.appendChild(createEl('div',{classes : 'navigation bottoniera'}));
        nav.innerHTML = '';
        [{
            icon : 'first_page',
            name : 'first',
            prev : true,
            all : true
        },{
            icon : 'keyboard_arrow_left',
            name : 'prev',
            prev : true
        },{
            icon : 'keyboard_arrow_right',
            name : 'next'
        },{
            icon : 'last_page',
            name : 'last',
            all : true
        }]
        .forEach((el,i) => {
            if (i === 2) {
                nav.append(createEl('span',{
                    attributes : {
                        'data-rif' : 'elements_index'
                    },
                    innerText : '0 / 0'
                }))
            }
            nav.append(iconed_input({
                triggers : { click : e => this.navigate_elements({
                    prev : el.prev,
                    all : el.all,
                    target : e.target
                })},
                icon : el.icon,
                classes : 'round'
            }))
        })
    }

    update_nav_btns() {
        let list = this.actual_elements
        const [
            first_pg_btn,
            prev_pg_btn,
            next_pg_btn,
            last_pg_btn
        ] = [...this.navigation_container.querySelectorAll('button')]
        const index_sp = this.navigation_container.querySelector('[data-rif="elements_index"]')
        const elements_index = this.elements_index
        const max_elements = this.max_elements
    
        let pages = list.length > max_elements ? Math.ceil(list.length / max_elements) : 1
        let page_index = list.length > max_elements ? Math.ceil((elements_index + max_elements) / max_elements) : 1
        let shown = Math.min(elements_index + max_elements,list.length)
        let totals = list.length
        index_sp.innerText = `${shown} / ${totals}`
    
        let show_first = page_index > 1 && pages > 1 && list.length //shown < totals && shown
        let show_prev = show_first && page_index > 2
        let show_last = pages > 1 && page_index < pages && list.length//shown && shown < totals 
        let show_next = show_last && page_index < pages-1
    
        first_pg_btn.style.opacity = show_first ? 1 : 0
        prev_pg_btn.style.opacity = show_prev ? 1 : 0
        last_pg_btn.style.opacity = show_last ? 1 : 0
        next_pg_btn.style.opacity = show_next ? 1 : 0
    
        first_pg_btn.disabled = !show_first
        prev_pg_btn.disabled = !show_prev
        last_pg_btn.disabled = !show_last
        next_pg_btn.disabled = !show_next
    }

    navigate_elements({prev,all}) {
        if (prev) {
            if (all) this.elements_index = 0
            else this.elements_index -= this.max_elements // definire meglio
        } else {
            if (all) this.elements_index = this.actual_elements.length - this.max_elements
            else this.elements_index += this.max_elements // definire meglio
        }
        this.show_elements(true)
    }

    select_row({target,is_radio,not_check_all_cb}) {
        const id = parentEl(target,'cell',true).getAttribute('data-id')
        if (is_radio) return [...this.table.querySelectorAll('.cell:not(.header)')]
        .forEach(c => {c.classList.toggle('selected',c.getAttribute('data-id') === id)});
        const is_selected = target.checked;
        [...this.table.querySelectorAll(`.cell:not(.header)[data-id="${id}"]`)]
        .forEach(c => {c.classList.toggle('selected',is_selected)})

        if (not_check_all_cb) return
        const all_cb = this.table.querySelector('.cell.header:nth-child(1) input[type="checkbox"]')
        if (!all_cb) return
        const checked_rows = [...this.table.querySelectorAll('.cell.row_header input[type="checkbox"]:checked')].length
        const are_all_selected = 
            [...this.table.querySelectorAll('.cell.row_header input[type="checkbox"]')].length ===
            checked_rows 
        all_cb.checked = are_all_selected 
        all_cb.indeterminate = !are_all_selected && checked_rows
      
    }

    
    /**
     * 
     * @param {HTMLInputElement} target 
     * @returns 
     */
    select_all(target) {
        if (!target) return
        [...this.table.querySelectorAll('.cell.row_header input[type="checkbox"]')]
        .forEach(el => {el.checked = target.checked; this.select_row({target : el, not_check_all_cb : true})})
    }

        /**
     * Inietta gli stili CSS necessari per il drag & drop e resizing
     * se non sono già presenti nel documento.
     */
    injectStyles() {
        if (document.getElementById('table-edit-styles')) return;
        
        const css = `
            .header.cell.draggable { cursor: grab; }
            .header.cell.draggable:active { cursor: grabbing; }
            .column.dragging { opacity: 0.5; border: 2px dashed var(--sp-cl1, #ff6600); }
            .column.drop-target-left { border-left: 3px solid var(--sp-cl1, #ff6600); }
            .column.drop-target-right { border-right: 3px solid var(--sp-cl1, #ff6600); }
            .col-resizer {
                position: absolute; top: 0; right: 0; width: 10px; height: 100%;
                cursor: col-resize; background: transparent; z-index: 10;
            }
            .col-resizer:hover, .col-resizer.resizing { background-color: var(--sp-cl1, #ff6600); opacity: 0.7; }
            .table.resizing-active { cursor: col-resize; user-select: none; }
            .table.resizing-active .cell { pointer-events: none; }
        `;
        const style = document.createElement('style');
        style.id = 'table-edit-styles';
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    /**
     * Configura Drag&Drop e Resize per una colonna in modalità Edit
     */
    setupHeaderEditing(headerCell, colDiv, index) {
        // 1. DRAG & DROP
        headerCell.draggable = true;
        
        headerCell.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
            colDiv.classList.add('dragging');
        });

        headerCell.addEventListener('dragend', () => {
            colDiv.classList.remove('dragging');
            this.clearDropTargets();
        });

        headerCell.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            e.dataTransfer.dropEffect = 'move';
            
            const rect = headerCell.getBoundingClientRect();
            const midpoint = rect.x + rect.width / 2;
            this.clearDropTargets();
            
            if (e.clientX < midpoint) {
                colDiv.classList.add('drop-target-left');
            } else {
                colDiv.classList.add('drop-target-right');
            }
        });

        headerCell.addEventListener('drop', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.clearDropTargets();
            
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            
            const rect = headerCell.getBoundingClientRect();
            const midpoint = rect.x + rect.width / 2;
            const dropPosition = e.clientX < midpoint ? 'before' : 'after';

            if (fromIndex !== toIndex) {
                this.reorderColumns(fromIndex, toIndex, dropPosition);
            }
            return false;
        });

        // 2. RESIZING
        const resizer = createEl('div', {classes: 'col-resizer'});
        resizer.draggable = true; 
        resizer.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });

        headerCell.appendChild(resizer);

        let startX, startWidth;

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault(); 
            e.stopPropagation(); 
            startX = e.pageX;
            startWidth = colDiv.getBoundingClientRect().width;
            resizer.classList.add('resizing');
            this.table.classList.add('resizing-active'); 
            
            const onMouseMove = (moveEvent) => {
                const currentX = moveEvent.pageX;
                const diff = currentX - startX;
                const newWidth = startWidth + diff;
                if (newWidth > 50) {
                    colDiv.style.width = `${newWidth}px`;
                    colDiv.style.flex = `0 0 ${newWidth}px`;
                }
            };

            const onMouseUp = () => {
                resizer.classList.remove('resizing');
                this.table.classList.remove('resizing-active');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.recalculateWidths();
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    clearDropTargets() {
        this.table.querySelectorAll('.column').forEach(c => {
            c.classList.remove('drop-target-left', 'drop-target-right');
        });
    }

    reorderColumns(fromIndex, toIndex, position) {
        let columnsState = this.colOrders.map((ord, idx) => ({ originalIndex: idx, currentOrder: ord }));
        columnsState.sort((a, b) => a.currentOrder - b.currentOrder);
        
        const fromPos = columnsState.findIndex(c => c.originalIndex === fromIndex);
        const [movedItem] = columnsState.splice(fromPos, 1);
        
        let newTargetIndex = columnsState.findIndex(c => c.originalIndex === toIndex);
        if (position === 'after') newTargetIndex++;
        
        columnsState.splice(newTargetIndex, 0, movedItem);
        
        columnsState.forEach((item, newOrder) => {
            console.log(item,newOrder)
            const col = this.table.querySelector(`.column[data-pos="${this.colOrders[item.originalIndex]}"]`)
            col.style.setProperty('--order', newOrder)
            // this.colOrders[item.originalIndex] = newOrder;
        });

        this.applyColumnStyles();
        this.triggerUpdate();
    }

    recalculateWidths() {
        const container = this.table.querySelector('.columns_container');
        const totalWidth = container.getBoundingClientRect().width; 
        const columns = this.table.querySelectorAll('.column');
        
        this.colWidths = new Array(this.headers.length);
        
        columns.forEach(col => {
            const idx = parseInt(col.getAttribute('data-col-index'));
            const pxWidth = col.getBoundingClientRect().width;
            const percent = ((pxWidth / totalWidth) * 100).toFixed(2) + '%';
            this.colWidths[idx] = percent;
            col.style.width = percent;
            col.style.flex = `0 0 ${percent}`;
        });

        this.triggerUpdate();
    }

    applyColumnStyles() {
        const columns = this.table.querySelectorAll('.column');
        columns.forEach(col => {
            const idx = parseInt(col.getAttribute('data-col-index'));
            if (this.colWidths[idx] && this.colWidths[idx] !== 'auto') {
                col.style.width = this.colWidths[idx];
                col.style.flex = `0 0 ${this.colWidths[idx]}`;
            } else {
                 col.style.flex = '1'; 
            }
            col.style.order = this.colOrders[idx];
        });
    }

    triggerUpdate() {
        if (this.onUpdate) {
            this.onUpdate({
                '--width': this.colWidths,
                '--order': this.colOrders
            });
        }
    }

    refresh() { 
        this.setup_table(); 
        this.show_elements();
    }
}








