const db = {
    availability: [{
        month: "octubre",
        weekend: 2,
        days: [20, 21, 22, 23],
        shift: [[[],[],[],[]],[[],[],[],[]],[[],[],[],[]]]
    }]
};

async function list(table) {
    return db[table];
}
async function get(table, month, weekend) {
    let record = await list(table);
    return record.filter( item => item.month === month && item.weekend === weekend)[0] || null;
}

async function upsert(table, data) {
    if (!db[table]) {
        db[table] = [];
    }
    let record = await get(table, data.month, data.weekend)
    if (record) {
        Object.assign(record, data)
    } else {
        db[table].push(data);
    }
}

function remove(table, id) {

}

async function query(table, q) {
    let col = await list(table);
    let keys = Object.keys(q);
    let key = keys[0]
    return col.filter( item => item[keys] === q[key])[0] || null;
}

export { list, get, upsert, remove, query }