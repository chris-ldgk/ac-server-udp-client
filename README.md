# AC Server UDP client

A strongly typed ACServer UDP client.

## Getting Started

```sh
npm install ac-server-udp-client
```

## Usage

```ts
import { ACUdpClient, UdpEvents } from "ac-server-udp-client";

/**
 * Initialize client with 12000 as receive- and 11000 as send-port
 */
const client = new ACUdpClient(12000, 11000);

/**
 * Listenable events
 */
client.on(UdpEvents.CAR_INFO, (info) => console.log(info));
client.on(UdpEvents.CAR_UPDATE, (info) => console.log(info));
client.on(UdpEvents.CHAT, (info) => console.log(info));
client.on(UdpEvents.CLIENT_EVENT, (info) => console.log(info));
client.on(UdpEvents.CLIENT_LOADED, (info) => console.log(info));
client.on(UdpEvents.COLLISION_WITH_CAR, (info) => console.log(info));
client.on(UdpEvents.COLLISION_WITH_ENV, (info) => console.log(info));
client.on(UdpEvents.CONNECTION_CLOSED, (info) => console.log(info));
client.on(UdpEvents.END_SESSION, (info) => console.log(info));
client.on(UdpEvents.SERVER_ERROR, (info) => console.log(info));
client.on(UdpEvents.LAP_COMPLETED, (info) => console.log(info));
client.on(UdpEvents.NEW_CONNECTION, (info) => console.log(info));
client.on(UdpEvents.NEW_SESSION, (info) => console.log(info));
client.on(UdpEvents.SESSION_INFO, (info) => console.log(info));
client.on(UdpEvents.VERSION, (info) => console.log(info));
client.on(UdpEvents.UNSUPPORTED_EVENT, (info) => console.log(info));
client.on(UdpEvents.UDP_CLOSE, () => console.log("UDP Closed"));
client.on(UdpEvents.UDP_ERROR, (info) => console.log(info));
client.on(UdpEvents.UDP_LISTENING, () => console.log("UDP client listening"));
client.on(UdpEvents.UDP_MESSAGE, (info) => console.log(info));

/**
 * Available server commands
 */
client.getCarInfo(0);
client.getSessionInfo();
client.setSessionInfo({
  version: 1.7,
  session_index: 1,
  current_session_index: 0,
  session_count: 3,
  server_name: "Server name",
  track: "imola",
  track_config: "",
  name: "Session Name",
  type: 0,
  time: 1000,
  laps: 10,
  wait_time: 10,
  ambient_temp: 30,
  road_temp: 25,
  weather_graphics: "",
  elapsed_ms: 0,
});
client.enableRealtimeReport(100);
client.sendMessage(0, "This is a message to car 0");
client.broadcastMessage("This is a message to all cars");
client.adminCommand("/kick 0");
client.restartSession();
client.nextSession();
client.kickUser(0);
```
