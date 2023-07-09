export interface Env {
    AC_PLUGIN_UDP_RECEIVE_PORT: number;
    AC_PLUGIN_UDP_SEND_PORT: number;
}

export function getEnv(): Env {
    return {
        AC_PLUGIN_UDP_RECEIVE_PORT: Number(process.env.AC_PLUGIN_UDP_RECEIVE_PORT),
        AC_PLUGIN_UDP_SEND_PORT: Number(process.env.AC_PLUGIN_UDP_SEND_PORT)
    }
}
