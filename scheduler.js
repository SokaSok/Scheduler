const Days = 
Array.from({length : 7}, (_,i) => {
    const d = mondayOfWeek(new Date())
    d.setDate(d.getDate() + i)
    return new Intl.DateTimeFormat(undefined, { weekday : 'short'}).format(d)
});


const scheduler = new Table({
    headers : Days,
    is_calendar_table : true,
    parent_element : document.getElementById('scheduler-view'),
    properties : {
        '--width' : [
            '100px',
            '200px',
            '200px',
            '200px',
            '200px',
            '200px',
            '200px',
            '200px',
        ]
    }
})