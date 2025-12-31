import { Server } from "cil-db"
import mongoose, { Schema } from "mongoose"
import { Block, Gateway } from "./schema"

let mongo = await mongoose.connect("mongodb://localhost:27017/test")

let s = new Server("mqtt://localhost", 1886, {})

s.on_block_data((gateway_uuid, block_uuid, value_name, val) => {
    console.log("block data received");
    (async () => {
        let gw = await Gateway.findOne({ uuid: gateway_uuid }).exec()
        if (gw === null) {
            // Gateway does not exist yet in database
            gw = await new Gateway({ blocks: [], metadata: {}, uuid: gateway_uuid }).save()

        }

        let blocks = gw.get("blocks")
        let in_arr = false
        for (let el of blocks) {
            if (el.toString() === block_uuid) {
                in_arr = true
                break
            }
        }

        if (!in_arr) {
            gw.set("blocks", [...blocks, block_uuid])
            await gw.save()
        }

        let block = await Block.findOne({ uuid: block_uuid }).exec()
        if (block === null) {
            block = new Block({
                latest_value: 0,
                metadata: {},
                parent_gateway: gateway_uuid,
                uuid: block_uuid
            })
        }

        if (value_name === "value") {
            block["latest_value"] = val
        } else {
            if (block["metadata"] === undefined) { block["metadata"] = {} }
            block["metadata"][value_name] = val
        }

        await block.save()
    })()
})

s.on_gateway_data((gateway_uuid, name, val) => {
    (async () => {
        let gw = await Gateway.findOne({ uuid: gateway_uuid }).exec()
        if (gw === null) {
            // Gateway does not exist yet in database
            gw = await new Gateway({ blocks: [], metadata: {}, uuid: gateway_uuid }).save()
        }

        gw["metadata"][name] = val
        await gw.save()
    })()
})