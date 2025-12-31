import { Server } from "cil-db"

import { Database } from "bun:sqlite"

const db = new Database("data.sql")

db.run(`CREATE TABLE IF NOT EXISTS gateways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT,
    meta JSON
)`)

db.run(`CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    parent TEXT NOT NULL,
    value ANY,
    meta JSON
    )`)

let s = new Server("mqtt://localhost", 1886, {})

s.on_block_data((gateway_uuid, block_uuid, value_name, val) => {
    console.log("block data received");

    let q = db.query(`INSERT OR IGNORE INTO gateways(uuid, name, meta) VALUES (?, "", "{}") `)
    let res = q.run(gateway_uuid)

    q = db.query(`SELECT * FROM blocks WHERE uuid = ?`)
    let res2 = q.get(block_uuid);

    console.log(res2)

    if (res2 === null) {

        let q = db.query(`INSERT INTO blocks(uuid, parent, value, meta) VALUES (?, ?, ?, ?)`)

        let block_value = null
        let block_meta = {}

        if (value_name === "value") {
            block_value = val
        } else {
            block_meta[value_name] = val
        }

        q.run(block_uuid, gateway_uuid, block_value, JSON.stringify(block_meta))

        console.log("Created new block")
    } else {
        if (value_name === "value") {
            // update the value field
            let q = db.query(`
                UPDATE blocks
                SET value = ?
                WHERE uuid = ?
            `)

            q.run(JSON.stringify(val), block_uuid)
        } else {
            let q1 = db.query(`
                SELECT meta FROM blocks WHERE uuid = ?`
            )

            let res = q1.get(block_uuid)

            if (res === null || res === undefined) { throw "" }
            console.log("RES", res)
            let prev_meta = {}
            prev_meta[value_name] = val
            for (let [k, v] of Object.entries(JSON.parse(res["meta"]))) {
                if (k === value_name) continue;
                prev_meta[k] = v
            }
            console.log("prev_meta", prev_meta)
            console.log(value_name, val)
            console.log("ES")

            console.log("new", prev_meta)
            let q2 = db.query(`UPDATE blocks 
                SET meta = ?
                WHERE uuid = ?`)

            q2.run(JSON.stringify(prev_meta), block_uuid)
        }
    }
    // let blocks = gw.get("blocks")
    // let in_arr = false
    // for (let el of blocks) {
    //     if (el.toString() === block_uuid) {
    //         in_arr = true
    //         break
    //     }
    // }

    // if (!in_arr) {
    //     gw.set("blocks", [...blocks, block_uuid])
    //     await gw.save()
    // }

    // let block = await Block.findOne({ uuid: block_uuid }).exec()
    // if (block === null) {
    //     block = new Block({
    //         latest_value: 0,
    //         metadata: {},
    //         parent_gateway: gateway_uuid,
    //         uuid: block_uuid
    //     })
    // }

    // if (value_name === "value") {
    //     block["latest_value"] = val
    // } else {
    //     if (block["metadata"] === undefined) { block["metadata"] = {} }
    //     block["metadata"][value_name] = val
    // }

    // await block.save()

})

// s.on_gateway_data((gateway_uuid, name, val) => {
//     (async () => {
//         let gw = await Gateway.findOne({ uuid: gateway_uuid }).exec()
//         if (gw === null) {
//             // Gateway does not exist yet in database
//             gw = await new Gateway({ blocks: [], metadata: {}, uuid: gateway_uuid }).save()
//         }

//         gw["metadata"][name] = val
//         await gw.save()
//     })()
// })