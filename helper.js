        // Icone Material Icons Mapping
const icone = {
    // Generiche
    hidden : 'menu',
    shown : 'menu_open',
    sincronizzazione : 'sync',
    sinc_ko : 'sync_problem',
    sinc_ok : 'done',
    ok : 'check_circle',
    ko : 'error',
    visualizza : 'visibility', // 'edit_off' nel vecchio, visibility è più standard per anteprima
    modifica : 'edit',
    annulla: 'close', // Spesso usato come X
    annullato: 'close', // Varianti trovate nel codice
    salva: 'save',
    elimina: 'delete',
    duplica: 'content_copy',
    aggiungi: 'add',
    anteprima: 'visibility',
    'no commitment' : 'frame_exclamation',
    
    // Player
    play: 'play_arrow',
    pausa: 'pause',
    avanti: 'skip_next',
    indietro: 'skip_previous',

    // Ruoli / Utenti
    coordinatore : 'engineering',
    docente : 'person',
    esterno : 'person_off',
    staff : 'admin_panel_settings',
    
    // File / Documenti
    consegnato : 'archive',
    cartella : 'folder',
    file : 'insert_drive_file',
    documento : 'description',
    
    // Didattica / Status
    presenza : 'groups',
    dad : 'phonelink',
    mista : 'person_remove',
    asincrona : 'access_time',
    'non assegnato' : 'report_problem',
    
    // Tipi Contenuto
    notizia: 'article',
    tabella: 'table_chart',
    banner: 'campaign'
};

        
// --- HELPER FUNCTIONS (from request) ---
function createEl(tag, varie) {
    var elem = document.createElement(tag);
    if (varie) {
        if (varie.classes) elem.className = varie.classes;
        if (varie.attributes) Object.keys(varie.attributes).forEach(k => {
            elem.setAttribute(k, varie.attributes[k]);
        });
        if (varie.properties) Object.keys(varie.properties).forEach(k => {
            elem.style.setProperty(k, varie.properties[k]);
        });
        if (varie.triggers) Object.keys(varie.triggers).forEach(k => {
            elem.addEventListener(k, varie.triggers[k]);
        });
        if (varie.figli) varie.figli.forEach(el => {
            if(el) elem.appendChild(el);
        });
        else if (varie.innerText) elem.innerText = varie.innerText;
        else if (varie.innerHTML) elem.innerHTML = varie.innerHTML;
    }
    return elem;
}

// Helper for icons used in table.js
function iconed_element(tag, icon, options) {
    const el = createEl(tag, options);
    const i = createEl('span', { classes: 'material-icons', innerText: icon });
    el.prepend(i);
    return el;
}
function iconed_input(options) {
    const btn = createEl('button', { ...options, innerText: '' });
    btn.innerHTML = `<span class="material-icons">${options.icon}</span>`;
    return btn;
}
function parentEl(el, cls, self) {
    if (self && el.classList.contains(cls)) return el;
    return el.closest('.' + cls);
}

// --- HSL COLOR UTILS ---
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
        r = "0x" + hex[1] + hex[1];
        g = "0x" + hex[2] + hex[2];
        b = "0x" + hex[3] + hex[3];
    } else if (hex.length == 7) {
        r = "0x" + hex[1] + hex[2];
        g = "0x" + hex[3] + hex[4];
        b = "0x" + hex[5] + hex[6];
    }
    r /= 255; g /= 255; b /= 255;
    let cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin, h = 0, s = 0, l = 0;
    if (delta == 0) h = 0;
    else if (cmax == r) h = ((g - b) / delta) % 6;
    else if (cmax == g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
    return {h, s, l};
}