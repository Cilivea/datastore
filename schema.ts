import mongoose, { Schema } from "mongoose";
import crypto from "node:crypto"
const BlockSchema = new mongoose.Schema({
    latest_value: {},
    uuid: { type: Schema.Types.UUID, required: true },
    parent_gateway: { type: Schema.Types.UUID, required: true },
    metadata: {}
})

export type Block = mongoose.InferSchemaType<typeof BlockSchema>;
export const Block = mongoose.model('block', BlockSchema);

const GatewaySchema = new mongoose.Schema({
    uuid: { type: Schema.Types.UUID, required: true },
    blocks: [Schema.Types.UUID],
    metadata: {}
})


export type Gateway = mongoose.InferSchemaType<typeof GatewaySchema>;
export const Gateway = mongoose.model('gateway', GatewaySchema);

