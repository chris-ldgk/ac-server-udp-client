export enum UdpEvents {
    CAR_INFO = "car_info",
    CAR_UPDATE = 'car_update',
    CHAT = 'chat',
    CLIENT_EVENT = 'client_event',
    CLIENT_LOADED = 'client_loaded',
    COLLISION_WITH_CAR = 'collision_with_car',
    COLLISION_WITH_ENV = 'collision_with_env',
    CONNECTION_CLOSED = 'connection_closed',
    END_SESSION = 'end_session',
    SERVER_ERROR = 'server_error',
    LAP_COMPLETED = 'lap_completed',
    NEW_CONNECTION = 'new_connection',
    NEW_SESSION = 'new_session',
    SESSION_INFO = 'session_info',
    VERSION = 'version',
    UNSUPPORTED_EVENT = "unsupported_event",
    UDP_CLOSE = "udp_close",
    UDP_ERROR = "udp_error",
    UDP_LISTENING = "udp_listening",
    UDP_MESSAGE = "udp_message",
}

export enum EventTypes {
    COLLISION_WITH_CAR = 10,
    COLLISION_WITH_ENV = 11,
    NEW_SESSION = 50,
    NEW_CONNECTION = 51,
    CONNECTION_CLOSED = 52,
    CAR_UPDATE = 53,
    CAR_INFO = 54,
    END_SESSION = 55,
    VERSION = 56,
    CHAT = 57,
    CLIENT_LOADED = 58,
    SESSION_INFO = 59,
    ERROR = 60,
    LAP_COMPLETED = 73,
    CLIENT_EVENT = 130,
}

export enum CommandTypes {
    REALTIMEPOS_INTERVAL = 200,
    GET_CAR_INFO = 201,
    SEND_CHAT = 202,
    BROADCAST_CHAT = 203,
    GET_SESSION_INFO = 204,
    SET_SESSION_INFO = 205,
    KICK_USER = 206,
    NEXT_SESSION = 207,
    RESTART_SESSION = 208,
    ADMIN_COMMAND = 209
}

export interface SessionInfo {
    version: number;
    session_index: number;
    current_session_index: number;
    session_count: number;
    server_name: string;
    track: string;
    track_config: string;
    name: string;
    type: number;
    time: number;
    laps: number;
    wait_time: number;
    ambient_temp: number;
    road_temp: number;
    weather_graphics: string;
    elapsed_ms: number;
}

export interface Vector3<T = number> {
    x: T;
    y: T;
    z: T;
}

export type ClientEvent = Pick<CarInfo, "car_id"> & {
    event_type: EventTypes.COLLISION_WITH_ENV | EventTypes.COLLISION_WITH_CAR;
    other_car_id: number | undefined;
    impact_speed: number;
    world_pos: Vector3<number>;
    rel_pos: Vector3<number>
}

export type ChatMessage = Pick<CarInfo, "car_id"> & {
    message: string;
}

export type ConnectionCarInfo = Pick<CarInfo, "car_id" | "car_model" | "car_skin" | "driver_name" | "driver_guid">

export interface CarInfo {
    driver_team: string;
    driver_name: string;
    driver_guid: string;
    car_id: number;
    car_model: string;
    car_skin: string;
    is_connected: boolean;
}

export type CarUpdateInfo = Pick<CarInfo, "car_id"> & {
    pos: Vector3<number>,
    velocity: Vector3<number>;
    gear: number;
    engine_rpm: number;
    normalized_spline_pos: number;
}

export type PlayerClient = Pick<CarInfo, "car_id">

export type LapInfo = Pick<CarInfo, "car_id"> & {
    laptime: number;
    cuts: number;
    cars_count: number;
    grip_level: number;
    leaderboard: Leaderboard
}

export type Leaderboard = LeaderboardEntry[]

export type LeaderboardEntry = Pick<CarInfo, "car_id"> & Pick<LapInfo, "laptime"> & {
    laps: number;
    completed: boolean
}