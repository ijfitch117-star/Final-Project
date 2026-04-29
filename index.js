const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// ──────────────────────────────────────────────
// Hardcoded users
// ──────────────────────────────────────────────

const USERS = [
    { username: "admin", password: "password123" },
    { username: "user1", password: "serviceworm99" },
];

// ──────────────────────────────────────────────
// In-memory session store
// Key: sessionId (random string)
// Value: { username, createdAt }
// ──────────────────────────────────────────────

const sessions = {};
const SESSION_MAX_AGE = 60 * 60 * 1000; // 1 hour in ms

function createSession(username) {
    const sessionId = crypto.randomBytes(32).toString("hex");
    sessions[sessionId] = {
        username,
        createdAt: Date.now(),
    };
    console.log(`[SESSION] Created session for "${username}" -> ${sessionId.slice(0, 12)}...`);
    console.log(`[SESSION] Active sessions: ${Object.keys(sessions).length}`);
    return sessionId;
}

function getSession(sessionId) {
    if (!sessionId) return null;
    const session = sessions[sessionId];
    if (!session) {
        console.log(`[SESSION] Session not found: ${sessionId.slice(0, 12)}...`);
        return null;
    }
    // Check if expired
    if (Date.now() - session.createdAt > SESSION_MAX_AGE) {
        console.log(`[SESSION] Session expired for "${session.username}"`);
        delete sessions[sessionId];
        return null;
    }
    return session;
}

function destroySession(sessionId) {
    if (sessions[sessionId]) {
        console.log(`[SESSION] Destroyed session for "${sessions[sessionId].username}"`);
        delete sessions[sessionId];
    }
}

// ──────────────────────────────────────────────
// Cookie helpers
// ──────────────────────────────────────────────

function parseCookies(req) {
    const cookieHeader = req.headers.cookie || "";
    const cookies = {};
    cookieHeader.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.trim().split("=");
        if (name) {
            cookies[name.trim()] = rest.join("=").trim();
        }
    });
    return cookies;
}

function setSessionCookie(res, sessionId) {
    // HttpOnly so JS can't touch it, Path=/ so it's sent on every request
    const cookie = `sid=${sessionId}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE / 1000}`;
    console.log(`[COOKIE] Setting cookie: sid=${sessionId.slice(0, 12)}...`);
    res.setHeader("Set-Cookie", cookie);
}

function clearSessionCookie(res) {
    console.log("[COOKIE] Clearing session cookie");
    res.setHeader("Set-Cookie", "sid=; HttpOnly; Path=/; Max-Age=0");
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => resolve(body));
        req.on("error", reject);
    });
}

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}

function serveFile(res, filePath, contentType) {
    console.log(`[FILE] Serving: ${filePath}`);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            console.log(`[FILE] ERROR reading ${filePath}:`, err.message);
            res.writeHead(500);
            res.end("Error loading page");
            return;
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
    });
}

// ──────────────────────────────────────────────
// MongoDB
// ──────────────────────────────────────────────

let servicesCollection;

async function connectDB() {
    try {
        await client.connect();
        servicesCollection = client.db("ServiceDB").collection("serviceCol");
        console.log("[DB] Connected to MongoDB");
    } catch (e) {
        console.error("[DB] MongoDB connection failed:", e);
        process.exit(1);
    }
}

// ──────────────────────────────────────────────
// Server
// ──────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    console.log(`\n[REQ] ${req.method} ${pathname}`);

    // Parse cookies on every request
    const cookies = parseCookies(req);
    const sessionId = cookies.sid;
    const session = getSession(sessionId);

    if (session) {
        console.log(`[AUTH] Valid session for "${session.username}"`);
    } else {
        console.log("[AUTH] No valid session");
    }

    // ─── PUBLIC: Login page ───────────────────

    if (pathname === "/login" && req.method === "GET") {
        console.log("[ROUTE] Serving login page");
        // If already logged in, redirect to /services
        if (session) {
            console.log("[ROUTE] Already logged in, redirecting to /services");
            res.writeHead(302, { Location: "/services" });
            res.end();
            return;
        }
        serveFile(res, path.join(__dirname, "public", "login.html"), "text/html");
        return;
    }

    // ─── PUBLIC: Login API ────────────────────

    if (pathname === "/login" && req.method === "POST") {
        console.log("[ROUTE] Login attempt...");
        const body = await readBody(req);
        let parsed;
        try {
            parsed = JSON.parse(body);
        } catch {
            console.log("[LOGIN] Bad JSON in request body");
            sendJSON(res, 400, { error: "Invalid JSON" });
            return;
        }

        const { username, password } = parsed;
        console.log(`[LOGIN] Trying username="${username}"`);

        const user = USERS.find(
            (u) => u.username === username && u.password === password
        );

        if (!user) {
            console.log(`[LOGIN] FAILED for username="${username}"`);
            sendJSON(res, 401, { error: "Invalid username or password" });
            return;
        }

        console.log(`[LOGIN] SUCCESS for username="${username}"`);
        const newSessionId = createSession(user.username);
        setSessionCookie(res, newSessionId);
        sendJSON(res, 200, { success: true, username: user.username });
        return;
    }

    // ─── PUBLIC: Logout ───────────────────────

    if (pathname === "/logout") {
        console.log("[ROUTE] Logout");
        if (sessionId) destroySession(sessionId);
        clearSessionCookie(res);
        res.writeHead(302, { Location: "/login" });
        res.end();
        return;
    }

    // ─── ROOT: redirect ───────────────────────

    if (pathname === "/") {
        if (session) {
            console.log("[ROUTE] / -> redirecting to /services (logged in)");
            res.writeHead(302, { Location: "/services" });
        } else {
            console.log("[ROUTE] / -> redirecting to /login (not logged in)");
            res.writeHead(302, { Location: "/login" });
        }
        res.end();
        return;
    }

    // ─── AUTH WALL: everything below requires login ───

    if (!session) {
        if (pathname.startsWith("/api")) {
            console.log("[AUTH] Blocked API request - no session");
            sendJSON(res, 401, { error: "Unauthorized. Please log in." });
            return;
        }
        console.log("[AUTH] Blocked page request - redirecting to /login");
        res.writeHead(302, { Location: "/login" });
        res.end();
        return;
    }

    // ─── PROTECTED: service collection page ──────

    if (pathname === "/services" && req.method === "GET") {
        console.log("[ROUTE] Serving services page (index.html)");
        serveFile(res, path.join(__dirname, "public", "index.html"), "text/html");
        return;
    }

    // ─── PROTECTED: About page ────────────────

    if (pathname === "/about" && req.method === "GET") {
        console.log("[ROUTE] Serving about page");
        serveFile(res, path.join(__dirname, "public", "about.html"), "text/html");
        return;
    }

    // ─── PROTECTED: API routes ────────────────

    // GET all services
    if (pathname === "/api" && req.method === "GET") {
        console.log("[API] GET all services");
        servicesCollection
            .find({})
            .toArray()
            .then((results) => {
                console.log(`[API] Found ${results.length} services`);
                sendJSON(res, 200, results);
            })
            .catch((err) => {
                console.log("[API] ERROR fetching services:", err.message);
                sendJSON(res, 500, { error: "Failed to fetch services" });
            });
        return;
    }

    // POST new service
    if (pathname === "/api" && req.method === "POST") {
        console.log("[API] POST new service");
        const body = await readBody(req);
        let service;
        try {
            service = JSON.parse(body);
        } catch {
            console.log("[API] Bad JSON in POST body");
            sendJSON(res, 400, { error: "Invalid JSON" });
            return;
        }
        service.addedBy = session.username;
        console.log(`[API] Adding service: "${service.name}" by "${service.price}" (user: ${session.username})`);
        servicesCollection
            .insertOne(service)
            .then((result) => {
                console.log("[API] service inserted:", result.insertedId);
                sendJSON(res, 201, result);
            })
            .catch((err) => {
                console.log("[API] ERROR inserting service:", err.message);
                sendJSON(res, 500, { error: "Failed to add service" });
            });
        return;
    }

    // PUT update service
    if (pathname.startsWith("/api/") && req.method === "PUT") {
        const id = pathname.split("/")[2];
        console.log(`[API] PUT update service id=${id}`);
        const body = await readBody(req);
        let updates;
        try {
            updates = JSON.parse(body);
        } catch {
            console.log("[API] Bad JSON in PUT body");
            sendJSON(res, 400, { error: "Invalid JSON" });
            return;
        }
        delete updates._id;
        delete updates.id;
        console.log("[API] Updates:", updates);

        servicesCollection
            .updateOne({ _id: new ObjectId(id) }, { $set: updates })
            .then((result) => {
                console.log(`[API] Updated: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);
                sendJSON(res, 200, result);
            })
            .catch((err) => {
                console.log("[API] ERROR updating service:", err.message);
                sendJSON(res, 500, { error: "Failed to update service" });
            });
        return;
    }

    // DELETE service
    if (pathname.startsWith("/api/") && req.method === "DELETE") {
        const id = pathname.split("/")[2];
        console.log(`[API] DELETE service id=${id}`);
        servicesCollection
            .deleteOne({ _id: new ObjectId(id) })
            .then((result) => {
                console.log(`[API] Deleted: deletedCount=${result.deletedCount}`);
                sendJSON(res, 200, result);
            })
            .catch((err) => {
                console.log("[API] ERROR deleting service:", err.message);
                sendJSON(res, 500, { error: "Failed to delete service" });
            });
        return;
    }

    // 404
    console.log(`[ROUTE] 404 - nothing matched for ${pathname}`);
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<h1>404 nothing is here</h1>");
});

const PORT = process.env.PORT || 5959;

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`\n[SERVER] Running on port ${PORT}`);
        console.log("[SERVER] Routes:");
        console.log("  GET  /login  - login page (public)");
        console.log("  POST /login  - login API (public)");
        console.log("  GET  /logout - destroy session & redirect");
        console.log("  GET  /services  - service collection page (protected)");
        console.log("  GET  /about  - about page (protected)");
        console.log("  GET  /api    - fetch all services (protected)");
        console.log("  POST /api    - add service (protected)");
        console.log("  PUT  /api/:id   - update service (protected)");
        console.log("  DELETE /api/:id - delete service (protected)");
        console.log("\n[SERVER] Hardcoded users:");
        USERS.forEach((u) => console.log(`  - ${u.username} / ${u.password}`));
        console.log("\n[SERVER] Waiting for requests...\n");
    });
});