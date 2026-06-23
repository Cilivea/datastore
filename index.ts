import { Server } from "cil-db";
import { Database } from "bun:sqlite";
import type { UUID } from "cilivea-value";

console.log("Updated testing");

const enable_aedes = false;

import { WebSocketServer, createWebSocketStream } from "ws";

import { Aedes } from "aedes";
import net from "net";
import http from "http";
const db = new Database("data.sql");

db.run(`CREATE TABLE IF NOT EXISTS gateways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    meta JSON
)`);

db.run(`CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    parent TEXT NOT NULL,
    value ANY,
    meta JSON
    )`);

let s = new Server("mqtt://localhost", 1886, {});

function insert_gateway(gateway_uuid: UUID) {
    let q = db.query(
        `INSERT OR IGNORE INTO gateways(uuid, meta) VALUES (?, ?) `,
    );
    q.run(gateway_uuid, JSON.stringify({}));
}

s.on_block_data((gateway_uuid, block_uuid, value_name, val) => {
    console.log("received block data", block_uuid);
    insert_gateway(gateway_uuid as UUID);

    let q = db.query(`SELECT * FROM blocks WHERE uuid = ?`);
    let saved_block = q.get(block_uuid) as {
        uuid: string;
        parent: string;
        value: any;
        meta: string;
    } | null;

    if (saved_block === null) {
        let q = db.query(
            `INSERT INTO blocks(uuid, parent, meta) VALUES (?, ?, ?)`,
        );
        q.run(block_uuid, gateway_uuid, JSON.stringify({}));

        saved_block = {
            meta: JSON.stringify({}),
            value: null,
            parent: gateway_uuid,
            uuid: block_uuid,
        };
    }
    console.log("saved block", saved_block);
    if (value_name === "value") {
        // update the value field
        let q = db.query(`
                UPDATE blocks
                SET value = ?
                WHERE uuid = ?
            `);

        q.run(JSON.stringify(val), block_uuid);
    } else {
        let prev_meta: { [key: string]: any } = {};

        prev_meta[value_name] = val;

        for (let [k, v] of Object.entries(JSON.parse(saved_block.meta))) {
            if (k === value_name) continue;
            prev_meta[k] = v;
        }

        let q2 = db.query(`UPDATE blocks 
                SET meta = ?
                WHERE uuid = ?`);

        q2.run(JSON.stringify(prev_meta), block_uuid);
    }
});

s.on_gateway_data((gateway_uuid, name, val) => {
    let q = db.query(
        `INSERT OR IGNORE INTO gateways(uuid, name, meta) VALUES (?, "", "{}") `,
    );
    let res = q.run(gateway_uuid);

    let q2 = db.query("SELECT meta FROM gateways WHERE uuid=?");
    let res2 = q2.get(gateway_uuid) as { [key: string]: any };

    let cloned_meta: { [key: string]: any } = {};

    for (let [k, v] of Object.entries(res2)) {
        cloned_meta[k] = v;
    }

    cloned_meta[name] = val;

    let q3 = db.query("UPATE gateways SET meta = ? WHERE uuid = ?");
    q3.run(cloned_meta, gateway_uuid);
});

if (enable_aedes) {
    const aedes = await Aedes.createBroker({});
    const tcp_server = net.createServer(aedes.handle);
    const httpServer = http.createServer();

    const wss = new WebSocketServer({
        server: httpServer,
    });

    wss.on("connection", (websocket, req) => {
        const stream = createWebSocketStream(websocket);
        aedes.handle(stream, req);
    });

    httpServer.listen(1888, function () {
        console.log("websocket server listening on port ", 1888);
    });

    tcp_server.listen(1886, () => {
        console.log(`[MQTT] Listening on port ${1886}`);
    });
}
