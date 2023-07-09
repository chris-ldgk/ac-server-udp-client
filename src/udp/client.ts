import { createSocket } from 'dgram';
import type { RemoteInfo, Socket } from 'dgram'
import { SmartBuffer } from 'smart-buffer'
import { CarInfo, ChatMessage, ClientEvent, EventTypes, SessionInfo, UdpEvents, PlayerClient, LapInfo, ConnectionCarInfo, CarUpdateInfo, CommandTypes } from './types';
import { readString, readStringW, readVector3f, writeStringW } from '../utils/buf';
import { TypedEventEmitter } from '../utils/events';

export type ACUdpClientEventTypes = {
    [UdpEvents.UDP_LISTENING]: []
    [UdpEvents.UDP_CLOSE]: []
    [UdpEvents.UDP_ERROR]: [arg1: Error]
    [UdpEvents.UDP_MESSAGE]: [arg1: number]
    [UdpEvents.VERSION]: [arg1: string]
    [UdpEvents.UNSUPPORTED_EVENT]: [arg1: number]
    [UdpEvents.SERVER_ERROR]: [arg1: string]
    [UdpEvents.NEW_SESSION]: [arg1: SessionInfo]
    [UdpEvents.SESSION_INFO]: [arg1: SessionInfo]
    [UdpEvents.END_SESSION]: [arg1: string]
    [UdpEvents.CHAT]: [arg1: ChatMessage]
    [UdpEvents.NEW_CONNECTION]: [arg1: ConnectionCarInfo]
    [UdpEvents.CONNECTION_CLOSED]: [arg1: ConnectionCarInfo]
    [UdpEvents.CLIENT_LOADED]: [arg1: PlayerClient]
    [UdpEvents.LAP_COMPLETED]: [arg1: LapInfo]
    [UdpEvents.CAR_INFO]: [arg1: CarInfo]
    [UdpEvents.CAR_UPDATE]: [arg1: CarUpdateInfo]
    [UdpEvents.CLIENT_EVENT]: [arg1: ClientEvent]
    [UdpEvents.COLLISION_WITH_CAR]: [arg1: ClientEvent]
    [UdpEvents.COLLISION_WITH_ENV]: [arg1: ClientEvent]
}

export class ACUdpClient extends TypedEventEmitter<ACUdpClientEventTypes> {
    private _client: Socket;

    constructor(
        private _receivePort: number, private _sendPort: number
    ) {
        super();
        this._client = createSocket('udp4')
        this._client.on("listening", this.onListening).on("message", this.onMessage).on("error", this.onClientError).on("close", this.onClose).bind(this._receivePort)
    }

    /**
     * Socket actions
     */
    private onClose = () => {
        this.emit(UdpEvents.UDP_CLOSE)
    }

    private onClientError = (err: Error) => {
        this.emit(UdpEvents.UDP_ERROR, err)
    }

    private onListening = () => {
        this.emit(UdpEvents.UDP_LISTENING)
    }

    private onMessage = (msg: Buffer, info: RemoteInfo) => {
        const buffer = SmartBuffer.fromBuffer(msg);
        const id = buffer.readUInt8();

        this.emit(UdpEvents.UDP_MESSAGE, id)

        switch (id) {
            case EventTypes.VERSION:
                return this.onVersion(buffer)
            case EventTypes.ERROR:
                return this.onError(buffer)
            case EventTypes.NEW_SESSION:
            case EventTypes.SESSION_INFO:
                return this.onSessionInfo(buffer, id)
            case EventTypes.END_SESSION:
                return this.onEndSession(buffer);
            case EventTypes.CHAT:
                return this.onChat(buffer);
            case EventTypes.NEW_CONNECTION:
            case EventTypes.CONNECTION_CLOSED:
                return this.onNewOrClosedConnection(buffer, id);
            case EventTypes.CLIENT_LOADED:
                return this.onClientLoaded(buffer);
            case EventTypes.LAP_COMPLETED:
                return this.onLapCompleted(buffer);
            case EventTypes.CAR_INFO:
                return this.onCarInfo(buffer);
            case EventTypes.CAR_UPDATE:
                return this.onCarUpdate(buffer);
            case EventTypes.CLIENT_EVENT:
                return this.onClientEvent(buffer);
            default:
                return this.onUnsupportedEvent(id)
        }
    }

    /**
     * Server events
     */
    private onVersion = (version: SmartBuffer) => {
        const ver = readStringW(version)
        this.emit(UdpEvents.VERSION, ver)
    }

    private onUnsupportedEvent = (id: number) => {
        this.emit(UdpEvents.UNSUPPORTED_EVENT, id)
    }

    private onError = (err: SmartBuffer) => {
        const error = readStringW(err);
        this.emit(UdpEvents.SERVER_ERROR, error)
    }

    private onSessionInfo(info: SmartBuffer, id: number) {
        const sessionInfo: SessionInfo = {
            version: info.readUInt8(),
            session_index: info.readUInt8(),
            current_session_index: info.readUInt8(),
            session_count: info.readUInt8(),
            server_name: readStringW(info),
            track: readString(info),
            track_config: readString(info),
            name: readString(info),
            type: info.readUInt8(),
            time: info.readUInt16LE(),
            laps: info.readUInt16LE(),
            wait_time: info.readUInt16LE(),
            ambient_temp: info.readUInt8(),
            road_temp: info.readUInt8(),
            weather_graphics: readString(info),
            elapsed_ms: info.readInt32LE()
        }

        if (sessionInfo.wait_time % 1000 > 0) {
            sessionInfo.wait_time += 0x10000
        }

        if (id === EventTypes.NEW_SESSION) {
            return this.emit(UdpEvents.NEW_SESSION, sessionInfo);
        } else {
            return this.emit(UdpEvents.SESSION_INFO, sessionInfo);
        }
    }

    private onEndSession = (buf: SmartBuffer) => {
        const filename = readStringW(buf)
        return this.emit(UdpEvents.END_SESSION, filename);
    }

    private onChat(buf: SmartBuffer) {
        const message: ChatMessage = {
            car_id: buf.readUInt8(),
            message: readStringW(buf),
        };

        if (this.isAllowedChatMessage(message.message)) this.emit(UdpEvents.CHAT, message)
    }

    private onNewOrClosedConnection = (buf: SmartBuffer, id: number) => {
        const carInfo: ConnectionCarInfo = {
            driver_name: readStringW(buf),
            driver_guid: readStringW(buf),
            car_id: buf.readUInt8(),
            car_model: readString(buf),
            car_skin: readString(buf)
        }

        if (id === Number(UdpEvents.NEW_CONNECTION)) return this.emit(UdpEvents.NEW_CONNECTION, carInfo);
        else return this.emit(UdpEvents.CONNECTION_CLOSED, carInfo);
    }

    private onClientLoaded = (buf: SmartBuffer) => {
        const client: PlayerClient = {
            car_id: buf.readUInt8()
        }

        this.emit(UdpEvents.CLIENT_LOADED, client)
    }

    private onLapCompleted = (buf: SmartBuffer) => {
        const lapInfo: LapInfo = {

            car_id: buf.readUInt8(),
            laptime: buf.readUInt32LE(),
            cuts: buf.readUInt8(),
            cars_count: buf.readUInt8(),
            grip_level: 0,
            leaderboard: []
        }

        for (let i = 0; i < lapInfo.cars_count; i++) {
            lapInfo.leaderboard.push({
                car_id: buf.readUInt8(),
                laptime: buf.readUInt32LE(),
                laps: buf.readUInt16LE(),
                completed: buf.readUInt8() !== 0
            })
        }
        lapInfo.grip_level = buf.readFloatLE()

        return this.emit(UdpEvents.LAP_COMPLETED, lapInfo)
    }

    private onCarInfo = (buf: SmartBuffer) => {
        const carInfo: CarInfo = {
            car_id: buf.readUInt8(),
            is_connected: buf.readUInt8() !== 0,
            car_model: readStringW(buf),
            car_skin: readStringW(buf),
            driver_name: readStringW(buf),
            driver_team: readStringW(buf),
            driver_guid: readStringW(buf)
        }

        return this.emit(UdpEvents.CAR_INFO, carInfo)
    }

    private onCarUpdate = (buf: SmartBuffer) => {
        const carInfo: CarUpdateInfo = {
            car_id: buf.readUInt8(),
            pos: readVector3f(buf),
            velocity: readVector3f(buf),
            gear: buf.readUInt8(),
            engine_rpm: buf.readUInt16LE(),
            normalized_spline_pos: buf.readFloatLE()
        }

        return this.emit(UdpEvents.CAR_UPDATE, carInfo)
    }

    private onClientEvent = (event: SmartBuffer) => {
        const event_type = event.readUInt8()
        const isCarCollision = event_type === EventTypes.COLLISION_WITH_CAR
        const isEnvCollision = event_type === EventTypes.COLLISION_WITH_ENV;

        const clientEvent: ClientEvent = {
            event_type,
            car_id: event.readUInt8(),
            other_car_id: isCarCollision ? event.readUInt8() : undefined,
            impact_speed: event.readFloatLE(),
            world_pos: readVector3f(event),
            rel_pos: readVector3f(event)
        }

        this.emit(UdpEvents.CLIENT_EVENT, clientEvent);
        if (isCarCollision) {
            return this.emit(UdpEvents.COLLISION_WITH_CAR, clientEvent);
        } else if (isEnvCollision) {
            return this.emit(UdpEvents.COLLISION_WITH_ENV, clientEvent)
        }
    }


    /**
     * Server commands
     */
    public getCarInfo = (car_id: number) => {
        const buf = SmartBuffer.fromSize(2)
        buf.writeUInt8(CommandTypes.GET_CAR_INFO, 0)
        buf.writeUInt8(car_id, 1)
        this.send(buf)
    }

    public getSessionInfo = (index = 0) => {
        const buf = SmartBuffer.fromSize(3)
        buf.writeUInt8(CommandTypes.GET_SESSION_INFO)
        buf.writeUInt16LE(index, 1)
        this.send(buf)
    }

    public setSessionInfo = (sessionInfo: SessionInfo) => {
        const nameBuf = writeStringW(sessionInfo.name)
        const buf = SmartBuffer.fromSize(nameBuf.length + 15)
        buf.writeUInt8(CommandTypes.SET_SESSION_INFO, 0)
        buf.writeUInt8(sessionInfo.session_index, 1)
        buf.writeBuffer(nameBuf, 2)
        buf.writeUInt8(sessionInfo.type, nameBuf.length + 2)
        buf.writeUInt32LE(sessionInfo.laps, nameBuf.length + 3)
        buf.writeUInt32LE(sessionInfo.time, nameBuf.length + 7)
        buf.writeUInt32LE(sessionInfo.wait_time, nameBuf.length + 11)

        this.send(buf)
    }

    public enableRealtimeReport = (interval: number) => {
        const buf = SmartBuffer.fromSize(3);
        buf.writeUInt8(CommandTypes.REALTIMEPOS_INTERVAL, 0);
        buf.writeInt16LE(interval, 1);
        this.send(buf)
    }

    public sendMessage = (id: number, message: string) => {
        const msgBuf = writeStringW(message)
        const buf = SmartBuffer.fromSize(msgBuf.length + 2)
        buf.writeUInt8(CommandTypes.SEND_CHAT, 0)
        buf.writeUInt8(id, 1)
        buf.writeBuffer(msgBuf, 2)
        this.send(buf)
    }

    public broadcastMessage = (message: string) => {
        const msgBuf = writeStringW(message)
        const buf = SmartBuffer.fromSize(msgBuf.length + 1)
        buf.writeUInt8(CommandTypes.BROADCAST_CHAT, 0)
        buf.writeBuffer(msgBuf, 1)
        this.send(buf)
    }

    public adminCommand = (command: string) => {
        const cmdBuf = writeStringW(command)
        const buf = SmartBuffer.fromSize(cmdBuf.length + 1)
        buf.writeUInt8(CommandTypes.ADMIN_COMMAND, 0)
        buf.writeBuffer(cmdBuf, 1)
        this.send(buf)
    }

    public restartSession = () => {
        const buf = SmartBuffer.fromSize(1)
        buf.writeUInt8(CommandTypes.RESTART_SESSION, 0)
        this.send(buf)
    }

    public nextSession = () => {
        const buf = SmartBuffer.fromSize(1)
        buf.writeUInt8(CommandTypes.NEXT_SESSION, 0)
        this.send(buf)
    }

    public kickUser = (car_id: number) => {
        const buf = SmartBuffer.fromSize(2)
        buf.writeUInt8(CommandTypes.KICK_USER, 0)
        buf.writeUInt8(car_id, 1)
        this.send(buf)
    }

    /**
     * Internal functions
     */
    private isAllowedChatMessage = (message: string) => message.trim().startsWith('/admin')

    private send = (buf: SmartBuffer) => {
        this._client.send(buf.toBuffer(), 0, buf.length, this._sendPort)
    }
}
