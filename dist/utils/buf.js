"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeStringW = exports.readVector3f = exports.readStringW = exports.readString = void 0;
const smart_buffer_1 = require("smart-buffer");
function readString(buf) {
    const length = buf.readUInt8();
    return buf.readString(length);
}
exports.readString = readString;
function readStringW(buf) {
    const length = buf.readUInt8();
    const message = buf.readString(length * 4, 'utf16le');
    return message.replace(/\u0000/gi, "");
}
exports.readStringW = readStringW;
function readVector3f(buf) {
    return {
        x: buf.readFloatLE(),
        y: buf.readFloatLE(),
        z: buf.readFloatLE()
    };
}
exports.readVector3f = readVector3f;
function writeStringW(input) {
    const str = input.substring(0, 255);
    const converted = str.split('').join('\u0000') + '\u0000';
    const buf = smart_buffer_1.SmartBuffer.fromSize(str.length * 4 + 1);
    buf.writeUInt8(str.length, 0);
    buf.writeString(converted, 1, 'utf16le');
    return buf.toBuffer();
}
exports.writeStringW = writeStringW;
