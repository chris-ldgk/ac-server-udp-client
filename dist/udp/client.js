"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACUdpClient = void 0;
const dgram_1 = require("dgram");
const smart_buffer_1 = require("smart-buffer");
const types_1 = require("./types");
const buf_1 = require("../utils/buf");
const events_1 = require("../utils/events");
class ACUdpClient extends events_1.TypedEventEmitter {
    constructor(_receivePort, _sendPort) {
        super();
        this._receivePort = _receivePort;
        this._sendPort = _sendPort;
        /**
         * Socket actions
         */
        this.onClose = () => {
            this.emit(types_1.UdpEvents.UDP_CLOSE);
        };
        this.onClientError = (err) => {
            this.emit(types_1.UdpEvents.UDP_ERROR, err);
        };
        this.onListening = () => {
            this.emit(types_1.UdpEvents.UDP_LISTENING);
        };
        this.onMessage = (msg, info) => {
            const buffer = smart_buffer_1.SmartBuffer.fromBuffer(msg);
            const id = buffer.readUInt8();
            this.emit(types_1.UdpEvents.UDP_MESSAGE, id);
            switch (id) {
                case types_1.EventTypes.VERSION:
                    return this.onVersion(buffer);
                case types_1.EventTypes.ERROR:
                    return this.onError(buffer);
                case types_1.EventTypes.NEW_SESSION:
                case types_1.EventTypes.SESSION_INFO:
                    return this.onSessionInfo(buffer, id);
                case types_1.EventTypes.END_SESSION:
                    return this.onEndSession(buffer);
                case types_1.EventTypes.CHAT:
                    return this.onChat(buffer);
                case types_1.EventTypes.NEW_CONNECTION:
                case types_1.EventTypes.CONNECTION_CLOSED:
                    return this.onNewOrClosedConnection(buffer, id);
                case types_1.EventTypes.CLIENT_LOADED:
                    return this.onClientLoaded(buffer);
                case types_1.EventTypes.LAP_COMPLETED:
                    return this.onLapCompleted(buffer);
                case types_1.EventTypes.CAR_INFO:
                    return this.onCarInfo(buffer);
                case types_1.EventTypes.CAR_UPDATE:
                    return this.onCarUpdate(buffer);
                case types_1.EventTypes.CLIENT_EVENT:
                    return this.onClientEvent(buffer);
                default:
                    return this.onUnsupportedEvent(id);
            }
        };
        /**
         * Server events
         */
        this.onVersion = (version) => {
            const ver = (0, buf_1.readStringW)(version);
            this.emit(types_1.UdpEvents.VERSION, ver);
        };
        this.onUnsupportedEvent = (id) => {
            this.emit(types_1.UdpEvents.UNSUPPORTED_EVENT, id);
        };
        this.onError = (err) => {
            const error = (0, buf_1.readStringW)(err);
            this.emit(types_1.UdpEvents.SERVER_ERROR, error);
        };
        this.onEndSession = (buf) => {
            const filename = (0, buf_1.readStringW)(buf);
            return this.emit(types_1.UdpEvents.END_SESSION, filename);
        };
        this.onNewOrClosedConnection = (buf, id) => {
            const carInfo = {
                driver_name: (0, buf_1.readStringW)(buf),
                driver_guid: (0, buf_1.readStringW)(buf),
                car_id: buf.readUInt8(),
                car_model: (0, buf_1.readString)(buf),
                car_skin: (0, buf_1.readString)(buf)
            };
            if (id === Number(types_1.UdpEvents.NEW_CONNECTION))
                return this.emit(types_1.UdpEvents.NEW_CONNECTION, carInfo);
            else
                return this.emit(types_1.UdpEvents.CONNECTION_CLOSED, carInfo);
        };
        this.onClientLoaded = (buf) => {
            const client = {
                car_id: buf.readUInt8()
            };
            this.emit(types_1.UdpEvents.CLIENT_LOADED, client);
        };
        this.onLapCompleted = (buf) => {
            const lapInfo = {
                car_id: buf.readUInt8(),
                laptime: buf.readUInt32LE(),
                cuts: buf.readUInt8(),
                cars_count: buf.readUInt8(),
                grip_level: 0,
                leaderboard: []
            };
            for (let i = 0; i < lapInfo.cars_count; i++) {
                lapInfo.leaderboard.push({
                    car_id: buf.readUInt8(),
                    laptime: buf.readUInt32LE(),
                    laps: buf.readUInt16LE(),
                    completed: buf.readUInt8() !== 0
                });
            }
            lapInfo.grip_level = buf.readFloatLE();
            return this.emit(types_1.UdpEvents.LAP_COMPLETED, lapInfo);
        };
        this.onCarInfo = (buf) => {
            const carInfo = {
                car_id: buf.readUInt8(),
                is_connected: buf.readUInt8() !== 0,
                car_model: (0, buf_1.readStringW)(buf),
                car_skin: (0, buf_1.readStringW)(buf),
                driver_name: (0, buf_1.readStringW)(buf),
                driver_team: (0, buf_1.readStringW)(buf),
                driver_guid: (0, buf_1.readStringW)(buf)
            };
            return this.emit(types_1.UdpEvents.CAR_INFO, carInfo);
        };
        this.onCarUpdate = (buf) => {
            const carInfo = {
                car_id: buf.readUInt8(),
                pos: (0, buf_1.readVector3f)(buf),
                velocity: (0, buf_1.readVector3f)(buf),
                gear: buf.readUInt8(),
                engine_rpm: buf.readUInt16LE(),
                normalized_spline_pos: buf.readFloatLE()
            };
            return this.emit(types_1.UdpEvents.CAR_UPDATE, carInfo);
        };
        this.onClientEvent = (event) => {
            const event_type = event.readUInt8();
            const isCarCollision = event_type === types_1.EventTypes.COLLISION_WITH_CAR;
            const isEnvCollision = event_type === types_1.EventTypes.COLLISION_WITH_ENV;
            const clientEvent = {
                event_type,
                car_id: event.readUInt8(),
                other_car_id: isCarCollision ? event.readUInt8() : undefined,
                impact_speed: event.readFloatLE(),
                world_pos: (0, buf_1.readVector3f)(event),
                rel_pos: (0, buf_1.readVector3f)(event)
            };
            this.emit(types_1.UdpEvents.CLIENT_EVENT, clientEvent);
            if (isCarCollision) {
                return this.emit(types_1.UdpEvents.COLLISION_WITH_CAR, clientEvent);
            }
            else if (isEnvCollision) {
                return this.emit(types_1.UdpEvents.COLLISION_WITH_ENV, clientEvent);
            }
        };
        /**
         * Server commands
         */
        this.getCarInfo = (car_id) => {
            const buf = smart_buffer_1.SmartBuffer.fromSize(2);
            buf.writeUInt8(types_1.CommandTypes.GET_CAR_INFO, 0);
            buf.writeUInt8(car_id, 1);
            this.send(buf);
        };
        this.getSessionInfo = (index = 0) => {
            const buf = smart_buffer_1.SmartBuffer.fromSize(3);
            buf.writeUInt8(types_1.CommandTypes.GET_SESSION_INFO);
            buf.writeUInt16LE(index, 1);
            this.send(buf);
        };
        this.setSessionInfo = (sessionInfo) => {
            const nameBuf = (0, buf_1.writeStringW)(sessionInfo.name);
            const buf = smart_buffer_1.SmartBuffer.fromSize(nameBuf.length + 15);
            buf.writeUInt8(types_1.CommandTypes.SET_SESSION_INFO, 0);
            buf.writeUInt8(sessionInfo.session_index, 1);
            buf.writeBuffer(nameBuf, 2);
            buf.writeUInt8(sessionInfo.type, nameBuf.length + 2);
            buf.writeUInt32LE(sessionInfo.laps, nameBuf.length + 3);
            buf.writeUInt32LE(sessionInfo.time, nameBuf.length + 7);
            buf.writeUInt32LE(sessionInfo.wait_time, nameBuf.length + 11);
            this.send(buf);
        };
        this.enableRealtimeReport = (interval) => {
            const buf = smart_buffer_1.SmartBuffer.fromSize(3);
            buf.writeUInt8(types_1.CommandTypes.REALTIMEPOS_INTERVAL, 0);
            buf.writeInt16LE(interval, 1);
            this.send(buf);
        };
        this.sendMessage = (id, message) => {
            const msgBuf = (0, buf_1.writeStringW)(message);
            const buf = smart_buffer_1.SmartBuffer.fromSize(msgBuf.length + 2);
            buf.writeUInt8(types_1.CommandTypes.SEND_CHAT, 0);
            buf.writeUInt8(id, 1);
            buf.writeBuffer(msgBuf, 2);
            this.send(buf);
        };
        this.broadcastMessage = (message) => {
            const msgBuf = (0, buf_1.writeStringW)(message);
            const buf = smart_buffer_1.SmartBuffer.fromSize(msgBuf.length + 1);
            buf.writeUInt8(types_1.CommandTypes.BROADCAST_CHAT, 0);
            buf.writeBuffer(msgBuf, 1);
            this.send(buf);
        };
        this.adminCommand = (command) => {
            const cmdBuf = (0, buf_1.writeStringW)(command);
            const buf = smart_buffer_1.SmartBuffer.fromSize(cmdBuf.length + 1);
            buf.writeUInt8(types_1.CommandTypes.ADMIN_COMMAND, 0);
            buf.writeBuffer(cmdBuf, 1);
            this.send(buf);
        };
        this.restartSession = () => {
            const buf = smart_buffer_1.SmartBuffer.fromSize(1);
            buf.writeUInt8(types_1.CommandTypes.RESTART_SESSION, 0);
            this.send(buf);
        };
        this.nextSession = () => {
            const buf = smart_buffer_1.SmartBuffer.fromSize(1);
            buf.writeUInt8(types_1.CommandTypes.NEXT_SESSION, 0);
            this.send(buf);
        };
        this.kickUser = (car_id) => {
            const buf = smart_buffer_1.SmartBuffer.fromSize(2);
            buf.writeUInt8(types_1.CommandTypes.KICK_USER, 0);
            buf.writeUInt8(car_id, 1);
            this.send(buf);
        };
        /**
         * Internal functions
         */
        this.isAllowedChatMessage = (message) => message.trim().startsWith('/admin');
        this.send = (buf) => {
            this._client.send(buf.toBuffer(), 0, buf.length, this._sendPort);
        };
        this._client = (0, dgram_1.createSocket)('udp4');
        this._client.on("listening", this.onListening).on("message", this.onMessage).on("error", this.onClientError).on("close", this.onClose).bind(this._receivePort);
    }
    onSessionInfo(info, id) {
        const sessionInfo = {
            version: info.readUInt8(),
            session_index: info.readUInt8(),
            current_session_index: info.readUInt8(),
            session_count: info.readUInt8(),
            server_name: (0, buf_1.readStringW)(info),
            track: (0, buf_1.readString)(info),
            track_config: (0, buf_1.readString)(info),
            name: (0, buf_1.readString)(info),
            type: info.readUInt8(),
            time: info.readUInt16LE(),
            laps: info.readUInt16LE(),
            wait_time: info.readUInt16LE(),
            ambient_temp: info.readUInt8(),
            road_temp: info.readUInt8(),
            weather_graphics: (0, buf_1.readString)(info),
            elapsed_ms: info.readInt32LE()
        };
        if (sessionInfo.wait_time % 1000 > 0) {
            sessionInfo.wait_time += 0x10000;
        }
        if (id === types_1.EventTypes.NEW_SESSION) {
            return this.emit(types_1.UdpEvents.NEW_SESSION, sessionInfo);
        }
        else {
            return this.emit(types_1.UdpEvents.SESSION_INFO, sessionInfo);
        }
    }
    onChat(buf) {
        const message = {
            car_id: buf.readUInt8(),
            message: (0, buf_1.readStringW)(buf),
        };
        if (this.isAllowedChatMessage(message.message))
            this.emit(types_1.UdpEvents.CHAT, message);
    }
}
exports.ACUdpClient = ACUdpClient;
