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

	const { name, x, y, z, vel, vel_x, vel_y, vel_z, pitch, yaw, roll, time, gamemode, role, health,
	        role_r, role_g, role_b, is_spectating, wall_hit, ground_hit, impact_strength,
	        took_damage, damage_amount, was_fall_damage } = parsed;

	if (typeof name !== "string" || [x, y, z, yaw, time].some((v) => typeof v !== "number")) {
		return res.status(400).json({ error: "Invalid telemetry payload" });
	}

	broadcast({
		type: "player_update",
		player: name,
		x, y, z, vel, vel_x, vel_y, vel_z, pitch, yaw, roll, time,
		gamemode: gamemode || "unknown",
		role: role || "unknown",
		health: health,
		role_r: typeof role_r === "number" ? role_r : 255,
		role_g: typeof role_g === "number" ? role_g : 255,
		role_b: typeof role_b === "number" ? role_b : 255,
		is_spectating: !!is_spectating,
		wall_hit: !!wall_hit,
		ground_hit: !!ground_hit,
		impact_strength: impact_strength || 0,
		took_damage: !!took_damage,
		damage_amount: damage_amount || 0,
		was_fall_damage: !!was_fall_damage,
	});
	res.status(200).json({ ok: true });
});

// NEW: simple GET endpoint GMod can poll for current viewer count
app.get("/viewers", (req, res) => {
	res.status(200).json({ viewers: clients.size });
});

app.get("/", (req, res) => {
	res.send("Telemetry relay is running.");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Relay listening on port ${PORT}`);
});
