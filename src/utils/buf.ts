import { SmartBuffer } from "smart-buffer";
import { Vector3 } from "../udp";


export function readString(buf: SmartBuffer) {
    const length = buf.readUInt8();
    return buf.readString(length);
}

export function readStringW(buf: SmartBuffer) {
    const length = buf.readUInt8();
    const message = buf.readString(length * 4, 'utf16le')
    return message.replace(/\u0000/gi, "");
}

export function readVector3f(buf: SmartBuffer): Vector3 {
    return {
        x: buf.readFloatLE(),
        y: buf.readFloatLE(),
        z: buf.readFloatLE()
    }
}

export function writeStringW(input: string) {
    const str = input.substring(0, 255);
    const converted = str.split('').join('\u0000') + '\u0000';

    const buf = SmartBuffer.fromSize(str.length * 4 + 1);
    buf.writeUInt8(str.length, 0);
    buf.writeString(converted, 1, 'utf16le')

    return buf.toBuffer();
}