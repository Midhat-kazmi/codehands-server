import "dotenv/config";
import WebSocket from "ws";

const serverUrl = process.env.SERVER_URL ?? "ws://localhost:3000/ws";
const deviceId = process.env.DEVICE_ID;
const token = process.env.DEV_TOKEN;

if (!deviceId || !token) {
  console.error("Missing DEVICE_ID or DEV_TOKEN in .env");
  process.exit(1);
}

// When each event was sent (on this laptop's clock), keyed by event ID
const sentAt = new Map<string, number>();

// Running tasks, keyed by session ID
type Task = { timers: NodeJS.Timeout[]; waiting: boolean };
const tasks = new Map<string, Task>();

function sendEvent(ws: WebSocket, sessionId: string, eventType: string) {
  const clientEventId = crypto.randomUUID();
  sentAt.set(clientEventId, performance.now());
  console.log("sending event", eventType);
  ws.send(
    JSON.stringify({
      type: "event",
      sessionId,
      eventType,
      clientEventId,
      payload: {},
      deviceTs: new Date().toISOString(),
    })
  );
}

function schedule(task: Task, ms: number, fn: () => void) {
  task.timers.push(setTimeout(fn, ms));
}

function startTask(ws: WebSocket, sessionId: string) {
  const task: Task = { timers: [], waiting: false };
  tasks.set(sessionId, task);
  sendEvent(ws, sessionId, "task.started");
  schedule(task, 300, () => sendEvent(ws, sessionId, "step.plan"));
  schedule(task, 600, () => sendEvent(ws, sessionId, "step.implement"));
  schedule(task, 900, () => {
    task.waiting = true;
    sendEvent(ws, sessionId, "approval.requested");
  });
}

function approveTask(ws: WebSocket, sessionId: string) {
  const task = tasks.get(sessionId);
  if (!task || !task.waiting) return console.log("nothing to approve for", sessionId);
  task.waiting = false;
  schedule(task, 300, () => sendEvent(ws, sessionId, "step.test"));
  schedule(task, 600, () => {
    sendEvent(ws, sessionId, "task.finished");
    tasks.delete(sessionId);
  });
}

function endTask(ws: WebSocket, sessionId: string, eventType: string) {
  const task = tasks.get(sessionId);
  if (!task) return console.log("no running task for", sessionId);
  task.timers.forEach(clearTimeout);
  tasks.delete(sessionId);
  sendEvent(ws, sessionId, eventType);
}

function connect() {
  console.log("connecting to", serverUrl);
  const ws = new WebSocket(`${serverUrl}?token=${token}&deviceId=${deviceId}`);

  ws.on("open", () => console.log("connected"));

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === "event_ack") {
      const start = sentAt.get(msg.clientEventId);
      if (start !== undefined) {
        console.log(`event stored, round trip ${Math.round(performance.now() - start)} ms`);
        sentAt.delete(msg.clientEventId);
      }
      return;
    }

    console.log("server says:", msg);

    if (msg.type === "command") {
      ws.send(JSON.stringify({ type: "ack", commandId: msg.commandId }));
      const sessionId: string = msg.sessionId ?? msg.payload?.sessionId;

      switch (msg.commandType) {
        case "start":
          startTask(ws, sessionId);
          break;
        case "approve":
          approveTask(ws, sessionId);
          break;
        case "reject":
          endTask(ws, sessionId, "task.rejected");
          break;
        case "stop":
          endTask(ws, sessionId, "task.stopped");
          break;
        default:
          console.log("unknown command type:", msg.commandType);
      }
    }
  });

  ws.on("error", (err) => console.log("connection error:", err.message));

  ws.on("close", () => {
    console.log("disconnected, retrying in 2 seconds...");
    setTimeout(connect, 2000);
  });
}

connect();