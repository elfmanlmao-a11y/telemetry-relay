const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on("connection", (ws) => {
	clients.add(ws);
	console.log(`Client connected. Total clients: ${clients.size}`);

	ws.on("close", () => {
		clients.delete(ws);
		console.log(`Client disconnected. Total clients: ${clients.size}`);
	});
});

function broadcast(data) {
	const payload = JSON.stringify(data);
	for (const ws of clients) {
		if (ws.readyState === ws.OPEN) {
			ws.send(payload);
		}
	}
}

app.post("/telemetry", (req, res) => {
	if (!req.body.data) {
		return res.status(400).json({ error: "Missing 'data' field" });
	}

	let parsed;
	try {
		parsed = JSON.parse(req.body.data);
	} catch (e) {
		return res.status(400).json({ error: "Invalid JSON in 'data' field" });
	}

	const { name, x, y, z, vel, pitch, yaw, roll, time, gamemode, role, health, role_r, role_g, role_b } = parsed;

	if (typeof name !== "string" || [x, y, z, yaw, time].some((v) => typeof v !== "number")) {
		return res.status(400).json({ error: "Invalid telemetry payload" });
	}

	broadcast({
		type: "player_update",
		player: name,
		x, y, z, vel, pitch, yaw, roll, time,
		gamemode: gamemode || "unknown",
		role: role || "unknown",
		health: health,
		role_r: typeof role_r === "number" ? role_r : 255,
		role_g: typeof role_g === "number" ? role_g : 255,
		role_b: typeof role_b === "number" ? role_b : 255,
	});
	res.status(200).json({ ok: true });
});

app.get("/", (req, res) => {
	res.send("Telemetry relay is running.");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Relay listening on port ${PORT}`);
});
