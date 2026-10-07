const mineflayer = require("mineflayer");
const fs = require("fs");

const config = JSON.parse(
    fs.readFileSync("./config.json", "utf8")
);

let bot;
let announcementTimers = [];
let antiAfkTimer = null;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createBot() {
    console.log("[BOT] Connecting...");
    console.log(`[BOT] Server: ${config.server.host}:${config.server.port}`);
    console.log(`[BOT] Username: ${config.account.username}`);

    bot = mineflayer.createBot({
        host: config.server.host,
        port: config.server.port,
        username: config.account.username,
        version: config.server.version
    });

    bot.once("spawn", async () => {
        console.log("[BOT] Spawned.");

        await sleep(config.account.loginDelay);

        console.log("[BOT] Logging in...");

        bot.chat(`/login ${config.account.password}`);

        await sleep(config.portals.beforeWalkDelay);

        if (config.portals.enabled) {
            await goThroughPortals();
        }

        await sleep(config.portals.afterPortalsDelay);

        console.log("[BOT] Ready.");

        startAntiAfk();
        startAnnouncements();
    });

    bot.on("message", (message) => {
        console.log(`[CHAT] ${message.toString()}`);
    });

    bot.on("kicked", (reason) => {
        console.log(`[BOT] Kicked: ${reason}`);
    });

    bot.on("kicked", (reason) => {
        console.log(`[BOT] Kicked: ${reason}`);
    });

    bot.on("error", (error) => {
        console.error("[BOT] Error:", error.message);
    });

    bot.on("end", () => {
        console.log("[BOT] Disconnected.");

        stopEverything();

        console.log("[BOT] Reconnecting in 10 seconds...");

        setTimeout(() => {
            createBot();
        }, 10000);
    });
}

async function goThroughPortals() {
    console.log("[PORTAL] Walking through first portal...");

    bot.setControlState("forward", true);

    await sleep(config.portals.firstWalkTime);

    bot.setControlState("forward", false);

    console.log("[PORTAL] First portal complete.");

    await sleep(config.portals.betweenPortalsDelay);

    console.log("[PORTAL] Walking through second portal...");

    bot.setControlState("forward", true);

    await sleep(config.portals.secondWalkTime);

    bot.setControlState("forward", false);

    console.log("[PORTAL] Second portal complete.");
}

function startAnnouncements() {
    if (!config.announcements || config.announcements.length === 0) {
        console.log("[ANNOUNCEMENTS] No announcements configured.");
        return;
    }

    console.log(
        `[ANNOUNCEMENTS] Starting ${config.announcements.length} announcements.`
    );

    config.announcements.forEach((announcement, index) => {
        if (!announcement.message || !announcement.interval) {
            console.log(
                `[ANNOUNCEMENTS] Skipping invalid announcement #${index + 1}`
            );
            return;
        }

        const timer = setInterval(() => {
            if (!bot || !bot.entity) return;

            bot.chat(announcement.message);

            console.log(
                `[ANNOUNCEMENT #${index + 1}] ${announcement.message}`
            );
        }, announcement.interval);

        announcementTimers.push(timer);
    });
}

function startAntiAfk() {
    if (!config.antiAfk.enabled) {
        console.log("[ANTI-AFK] Disabled.");
        return;
    }

    console.log("[ANTI-AFK] Enabled.");

    antiAfkTimer = setInterval(async () => {
        if (!bot || !bot.entity) return;

        if (config.antiAfk.move) {
            bot.setControlState("forward", true);

            await sleep(1000);

            bot.setControlState("forward", false);
        }

        if (config.antiAfk.jump) {
            bot.setControlState("jump", true);

            await sleep(300);

            bot.setControlState("jump", false);
        }

        if (config.antiAfk.lookAround) {
            const yaw = bot.entity.yaw + Math.PI / 2;

            bot.look(
                yaw,
                bot.entity.pitch,
                true
            );
        }

    }, config.antiAfk.interval);
}

function stopEverything() {
    for (const timer of announcementTimers) {
        clearInterval(timer);
    }

    announcementTimers = [];

    if (antiAfkTimer) {
        clearInterval(antiAfkTimer);
        antiAfkTimer = null;
    }

    if (bot) {
        bot.clearControlStates();
    }
}

createBot();
