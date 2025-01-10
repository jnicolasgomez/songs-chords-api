// const db = {
//   availability: [
//     {
//       month: "octubre",
//       weekend: 2,
//       days: [20, 21, 22, 23],
//       shift: [
//         [[], [], [], []],
//         [[], [], [], []],
//         [[], [], [], []],
//       ],
//     },
//   ],
//   songs: [],
// };
// async function list(table) {
//   return db[table];
// }
// async function get(table, id) {
//   let record = await list(table);
//   // return record.filter( item => item.month === month && item.weekend === weekend)[0] || null;
//   return record.filter((item) => item.id === id)[0] || null;
// }
// async function upsert(table, data) {
//   if (!db[table]) {
//     db[table] = [];
//   }
//   let record = await get(table, data.id);
//   if (record) {
//     Object.assign(record, data);
//   } else {
//     db[table].push(data);
//   }
// }
// /*function remove(table, id) {
// }*/
// async function query(table, q) {
//   let col = await list(table);
//   let keys = Object.keys(q);
//   let key = keys[0];
//   return col.filter((item) => item[keys] === q[key])[0] || null;
// }
// export { list, get, upsert, query };
const db = {
    availability: [
        {
            month: "octubre",
            weekend: 2,
            days: [20, 21, 22, 23],
            shift: [
                [[], [], [], []],
                [[], [], [], []],
                [[], [], [], []],
            ],
        },
    ],
    songs: [],
};
async function list(table) {
    return db[table];
}
async function get(table, id) {
    let record = await list(table);
    return record.filter((item) => item.id === id)[0] || null;
}
async function upsert(table, data) {
    if (!db[table]) {
        db[table] = [];
    }
    let record = await get(table, data.id);
    if (record) {
        Object.assign(record, data);
    }
    else {
        db[table].push(data);
    }
}
/*function remove(table, id) {

}*/
async function query(table, q) {
    let col = await list(table);
    let keys = Object.keys(q);
    let key = keys[0]; // Get the first key from the query
    return col.filter((item) => item[key] === q[key])[0] || null;
}
export { list, get, upsert, query };
