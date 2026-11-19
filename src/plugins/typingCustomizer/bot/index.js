/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 satanas and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "dotenv/config";

import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { Client, MessageFlags, REST, Routes, SlashCommandBuilder } from "discord.js";

const { DISCORD_TOKEN, GUILD_ID, PORT = "6523", DATA_DIR } = process.env;

const MAX_TEXT_LENGTH = 150;
const MAX_EMOJI_LENGTH = 32;
const WRITE_COOLDOWN = 5_000;

const dataDir = DATA_DIR ?? fileURLToPath(new URL("./data/", import.meta.url));

if (!DISCORD_TOKEN) {
    console.error("Missing DISCORD_TOKEN. Copy .env.example to .env and fill it in.");
    process.exit(1);
}

await mkdir(dataDir, { recursive: true });

const configPath = userId => join(dataDir, `${userId}.json`);
const lastWrite = new Map();

function sanitizeText(raw) {
    return raw.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
}

/** Returns null when the input is not 1 to 3 unicode emoji */
function parseEmojis(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    const parts = trimmed.split(/\s+/);
    const emojis = parts.length > 1
        ? parts.slice(0, 4)
        : [...new Intl.Segmenter().segment(trimmed)].map(segment => segment.segment).slice(0, 4);

    if (emojis.length > 3) return null;

    const valid = emojis.every(emoji =>
        emoji.length > 0
        && emoji.length <= MAX_EMOJI_LENGTH
        && !emoji.startsWith("<")
        && !/^:\w+:$/.test(emoji)
    );

    return valid ? emojis : null;
}

async function readConfig(userId) {
    try {
        const raw = JSON.parse(await readFile(configPath(userId), "utf8"));
        return { text: raw.text, emojis: raw.emojis };
    } catch {
        return null;
    }
}

async function deleteConfig(userId) {
    await rm(configPath(userId), { force: true });
}

async function writeConfig(userId, { text, emojis }) {
    if (!text && !emojis?.length) {
        await deleteConfig(userId);
        return;
    }

    const config = { v: 1, updatedAt: new Date().toISOString() };
    if (text) config.text = text;
    if (emojis?.length) config.emojis = emojis;

    const file = configPath(userId);
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(config));
    await rename(tmp, file);
}

const setCommand = new SlashCommandBuilder()
    .setName("set")
    .setDescription("Définit ton indicateur de saisie personnalisé (visible par les autres utilisateurs du plugin)")
    .addStringOption(option => option
        .setName("text")
        .setDescription("Texte affiché à la place de « est en train d'écrire… ». {user} sera remplacé par ton pseudo")
        .setMinLength(1)
        .setMaxLength(MAX_TEXT_LENGTH))
    .addStringOption(option => option
        .setName("emojis")
        .setDescription("Jusqu'à 3 emoji, un par point (ex: 👀💭✨)")
        .setMinLength(1)
        .setMaxLength(100));

const resetCommand = new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Remet ton indicateur de saisie sur celui de Discord")
    .addStringOption(option => option
        .setName("part")
        .setDescription("Ce qu'il faut réinitialiser")
        .addChoices(
            { name: "tout", value: "all" },
            { name: "le texte", value: "text" },
            { name: "les emoji", value: "emojis" }
        ));

const client = new Client({ intents: [] });

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        const rest = new REST().setToken(DISCORD_TOKEN);
        const route = GUILD_ID
            ? Routes.applicationGuildCommands(client.user.id, GUILD_ID)
            : Routes.applicationCommands(client.user.id);

        await rest.put(route, { body: [setCommand.toJSON(), resetCommand.toJSON()] });
        console.log(GUILD_ID ? `Registered /set and /reset in guild ${GUILD_ID}` : "Registered /set and /reset globally");
    } catch (e) {
        console.error("Failed to register the commands", e);
    }
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const userId = interaction.user.id;

    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (Date.now() - (lastWrite.get(userId) ?? 0) < WRITE_COOLDOWN) {
            await interaction.editReply("Doucement ! Réessaie dans quelques secondes.");
            return;
        }

        if (interaction.commandName === "reset") {
            const existing = await readConfig(userId);
            if (!existing) {
                await interaction.editReply("Tu n'as rien de configuré.");
                return;
            }

            lastWrite.set(userId, Date.now());

            const part = interaction.options.getString("part") ?? "all";
            await writeConfig(userId, {
                text: part === "all" || part === "text" ? undefined : existing.text,
                emojis: part === "all" || part === "emojis" ? undefined : existing.emojis
            });

            await interaction.editReply(part === "all"
                ? "Ton indicateur est revenu à celui de Discord."
                : `Réinitialisé : ${part === "text" ? "le texte" : "les emoji"}.`);
            return;
        }

        const existing = await readConfig(userId) ?? {};
        const textInput = interaction.options.getString("text");
        const emojiInput = interaction.options.getString("emojis");

        if (textInput == null && emojiInput == null) {
            await interaction.editReply("Donne au moins un texte ou des emoji.");
            return;
        }

        let { emojis } = existing;
        if (emojiInput != null) {
            const parsed = parseEmojis(emojiInput);
            if (parsed == null) {
                await interaction.editReply("Il faut au maximum 3 emoji unicode (ceux des serveurs ne sont pas supportés).");
                return;
            }
            emojis = parsed;
        }

        const text = textInput == null ? existing.text : sanitizeText(textInput);

        lastWrite.set(userId, Date.now());
        await writeConfig(userId, { text, emojis });

        const preview = [
            text ? `« ${text.replaceAll("{user}", interaction.user.displayName)} »` : null,
            emojis?.join("")
        ].filter(Boolean).join(" ");

        await interaction.editReply(`Enregistré : ${preview || "(vide)"}\nTous ceux qui ont le plugin le verront.`);
    } catch (e) {
        console.error(`Failed to handle /${interaction.commandName} for ${userId}`, e);
        await interaction.editReply("Ça a raté de mon côté, réessaie dans un instant.").catch(() => { });
    }
});

function send(res, status, type, body) {
    res.writeHead(status, {
        "content-type": `${type}; charset=utf-8`,
        "access-control-allow-origin": "*",
        "cache-control": status === 200 ? "public, max-age=60" : "public, max-age=10"
    });
    res.end(body);
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/health") {
        send(res, 200, "text/plain", "ok");
        return;
    }

    const match = url.pathname.match(/^\/(\d{17,20})\.json$/);
    if (!match) {
        send(res, 404, "text/plain", "not found");
        return;
    }

    try {
        send(res, 200, "application/json", await readFile(configPath(match[1])));
    } catch {
        send(res, 404, "text/plain", "no custom indicator");
    }
});

server.listen(Number(PORT), "127.0.0.1", () => {
    console.log(`Serving the indicators on http://127.0.0.1:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
        client.destroy();
        server.close(() => process.exit(0));
    });
}

await client.login(DISCORD_TOKEN);
