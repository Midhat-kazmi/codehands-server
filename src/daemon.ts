import "dotenv/config";
import WebSocket from "ws";

const serverUrl = process.env.SERVER_URL ?? "ws://localhost:3000/ws";
const deviceId = process.env.DEVICE_ID;
const token = process.env.DEV_TOKEN;

if (!deviceId || !token) {
  console.error("Missing DEVICE_ID or DEV_TOKEN in .env");
  process.exit(1);
}

// Pretend to run a task by sending fake events
function runMockTask(ws: WebSocket, sessionId: string) {
  const sendEvent = (eventType: string) => {
    console.log("sending event", eventType);
    ws.send(
      JSON.stringify({
        type: "event",
        sessionId,
        eventType,
        payload: {},
        deviceTs: new Date().toISOString(),
      })
    );
  };

  sendEvent("task.started");
  setTimeout(() => sendEvent("step.plan"), 300);
  setTimeout(() => sendEvent("step.implement"), 600);
  setTimeout(() => sendEvent("step.test"), 900);
  setTimeout(() => sendEvent("task.finished"), 1200);
}

function connect() {
  console.log("connecting to", serverUrl);
  const ws = new WebSocket(`${serverUrl}?token=${token}&deviceId=${deviceId}`);

  ws.on("open", () => console.log("connected"));

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    console.log("server says:", msg);

    if (msg.type === "command") {
      ws.send(JSON.stringify({ type: "ack", commandId: msg.commandId }));
      if (msg.commandType === "start") runMockTask(ws, msg.sessionId);
    }
  });

  ws.on("error", (err) => console.log("connection error:", err.message));

  ws.on("close", () => {
    console.log("disconnected, retrying in 2 seconds...");
    setTimeout(connect, 2000);
  });
}

connect();