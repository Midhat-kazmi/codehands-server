import WebSocket from "ws";

const deviceId = "c89abf96-2783-47a2-a896-6192324dc732";
const ws = new WebSocket(`ws://localhost:3000/ws?token=dev-secret-123&deviceId=${deviceId}`);

ws.on("open", () => console.log("connected"));

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  console.log("server says:", msg);

  if (msg.type === "command") {
    ws.send(JSON.stringify({ type: "ack", commandId: msg.commandId }));
    console.log("sent ack for", msg.commandId);

    const sendEvent = (eventType: string, payload: object = {}) => {
      console.log("sending event", eventType);
      ws.send(
        JSON.stringify({
          type: "event",
          sessionId: msg.sessionId,
          eventType,
          payload,
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
});

ws.on("close", (code, reason) => console.log("closed", code, reason.toString()));