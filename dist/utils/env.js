"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnv = void 0;
function getEnv() {
    return {
        AC_PLUGIN_UDP_RECEIVE_PORT: Number(process.env.AC_PLUGIN_UDP_RECEIVE_PORT),
        AC_PLUGIN_UDP_SEND_PORT: Number(process.env.AC_PLUGIN_UDP_SEND_PORT)
    };
}
exports.getEnv = getEnv;
