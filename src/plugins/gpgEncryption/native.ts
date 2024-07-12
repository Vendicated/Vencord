/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface Config {
    user: UserGpg;
    friends: UserGpg[];
}

interface UserGpg {
    id: string;
    keys: GpgKey[];
}

interface GpgKey {
    id: string;
    info: string;
    fingerprint: string;
}

function getDataDir(): string {
    if (process.env.XDG_DATA_HOME) {
        return process.env.XDG_DATA_HOME;
    } else {
        const homeDir = os.homedir();
        return path.join(homeDir, ".local", "share");
    }
}

const KEYRING_PATH = path.join(getDataDir(), "vencord/keys.gpg");

function gpg(command: string) {
    return `gpg --no-default-keyring --keyring ${KEYRING_PATH} ${command}`;
}

async function createKeyringIfNotExists(): Promise<boolean> {
    try {
        const gpgCommand = `gpg --no-default-keyring --keyring ${KEYRING_PATH} --fingerprint`;
        const res = await executeCommand(gpgCommand);
        if (res === "") return true;
    } catch (e) {
        console.log(e);
    }
    return false;
}

function createConfigFileIfNotExists(filePath: string): void {
    if (!fs.existsSync(filePath)) {
        const defaultConfig: Config = {
            user: { id: "", keys: [] },
            friends: [],
        };
        fs.writeFileSync(filePath, JSON.stringify(defaultConfig, null, 2));
    }
}

function executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`Error occurred executing \n: ${command}`);
                return reject(new Error(stderr));
            }
            resolve(stdout);
        });
    });
}

function readConfigFile(filePath: string): Config {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const config: Config = JSON.parse(fileContent);
    return config;
}

export async function getConfig(_: any): Promise<Config> {
    const configDir = path.join(getDataDir(), "vencord");
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    const configFilePath = path.join(configDir, "discord_gpg.json");
    createConfigFileIfNotExists(configFilePath);

    await createKeyringIfNotExists();

    return readConfigFile(configFilePath);
}

function saveConfig(config: Config): void {
    const configDir = path.join(getDataDir(), "vencord");
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    const configFilePath = path.join(configDir, "discord_gpg.json");

    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
    console.log("wrote config");
}

export async function getPublicKeyInfo(
    _: any,
    message: string,
): Promise<string> {
    const gpgCommand = `echo "${message}" | gpg --keyid-format long --list-packets`;
    const stdout = await executeCommand(gpgCommand);
    const result = stdout
        .split("\n")
        .find((u) => u.startsWith(":user"))
        ?.split("packet: ")[1]
        .replaceAll(`"`, "");
    if (!result) {
        throw new Error("unable to parse gpg");
    }
    return result;
}

export async function importKey(_: any, message: string): Promise<GpgKey> {
    const gpgCommand = `echo "${message}" | ${gpg("--import --import-options show-only")}`;
    const stdout = await executeCommand(gpgCommand);
    const keys = parsePublicKeys(stdout);

    const gpgCmd = `echo "${message}" | ${gpg("--import")}`;
    await executeCommand(gpgCmd);

    const signCmd = gpg(`--yes --batch --sign-key ${keys[0].fingerprint}`);
    await executeCommand(signCmd);

    return keys[0];
}

export async function importSigningKey(_: any, keyId: string): Promise<void> {
    try {
        const gpgExportCommand = `gpg --export-secret-keys --armor ${keyId}`;
        const privateKey = await executeCommand(gpgExportCommand);

        const gpgImportCommand = `echo "${privateKey}" | ${gpg("--import")}`;
        await executeCommand(gpgImportCommand);
    } catch (e) {
        // we don't care as well
        console.log(e);
    }

    const gpgListKeys = `${gpg("--list-secret-keys --keyid-format long")}`;
    const keys = parsePrivateKeys(await executeCommand(gpgListKeys));

    if (keys.length < 1) {
        throw new Error("could not import key successfully");
    }

    const gpgTrustCommand = `echo "${keys[0].fingerprint}:6:" | ${gpg("--import-ownertrust")}`;
    await executeCommand(gpgTrustCommand);
}

export async function saveKey(
    _: any,
    key: GpgKey,
    userId: string,
    self: boolean,
) {
    let config = await getConfig(_);
    if (self) {
        if (config.user.id !== "" && config.user.id !== userId) {
            console.log(userId, config.user.id);
            throw new Error("unable to change userId, what are you doing?");
        }
        config.user.id = userId;
        config.user.keys.push(key);
    } else {
        const tryUser = config.friends.findIndex((f) => f.id === userId);
        if (tryUser === -1) {
            config.friends.push({
                id: userId,
                keys: [key],
            });
        } else {
            const keyExists = config.friends[tryUser].keys.findIndex(
                (k) => k.fingerprint === key.fingerprint,
            );
            if (keyExists !== -1) return;
            config.friends[tryUser].keys.push(key);
        }
    }

    saveConfig(config);
}

export async function getPrivateKeys(): Promise<GpgKey[]> {
    const gpgCommand = `gpg --list-secret-keys --keyid-format long`;
    const stdout = await executeCommand(gpgCommand);

    return parsePrivateKeys(stdout);
}

async function getPublicKeys(): Promise<GpgKey[]> {
    const gpgCommand = `${gpg("--list-keys --keyid-format long")}`;
    const stdout = await executeCommand(gpgCommand);

    return parsePublicKeys(stdout);
}

// apology
// is this code disgusting? yes.
// do i have a proper parsing library? no.
// could i have used regex? probably.
// sincerely,
// zoey
function parseKeys(gpgResponse: string): string[][] {
    const lines = gpgResponse.split("\n");
    const keySplitIdxs = lines
        .map((a, idx) => {
            if (a === "") {
                return idx;
            }
            return undefined;
        })
        .filter((a) => a !== undefined); // in the gpg response there is an empty newline between each key's info

    const keyBlocks: string[][] = [];

    for (let i = 0; i < keySplitIdxs.length; i++) {
        const lastIdx = keySplitIdxs[i - 1] ?? 0;
        const keyBlock = lines.slice(lastIdx, keySplitIdxs[i]);
        keyBlocks.push(keyBlock.filter((keyLine) => keyLine !== ""));
    }

    return keyBlocks;
}

function parsePrivateKeys(gpgResponse: string) {
    const keyBlocks = parseKeys(gpgResponse);

    return keyBlocks
        .filter((keyBlock) => keyBlock.length !== 0)
        .map((keyBlock) => parsePrivateKey(keyBlock));
}

function parsePublicKeys(gpgResponse: string) {
    const keyBlocks = parseKeys(gpgResponse);

    return keyBlocks
        .filter((keyBlock) => keyBlock.length !== 0)
        .map((keyBlock) => parsePublicKey(keyBlock));
}

function parsePrivateKey(keyBlock: string[]): GpgKey {
    const secLine = keyBlock.find((l) => l.startsWith("sec"));
    const uidLine = keyBlock.find((l) => l.startsWith("uid"));
    const fingerprintLine = keyBlock.find((l) =>
        l.trim().startsWith("Key fingerprint"),
    );

    if (!secLine || !uidLine || !fingerprintLine) {
        throw new Error("could not parse private keys");
    }

    return parseKey(secLine, fingerprintLine, uidLine);
}

function parsePublicKey(keyBlock: string[]): GpgKey {
    const secLine = keyBlock.find((l) => l.startsWith("pub"));
    const uidLine = keyBlock.find((l) => l.startsWith("uid"));
    const fingerprintLine = keyBlock.find((l) =>
        l.trim().startsWith("Key fingerprint"),
    );

    if (!secLine || !uidLine || !fingerprintLine) {
        throw new Error("could not parse private keys");
    }

    return parseKey(secLine, fingerprintLine, uidLine);
}

function parseKey(
    idLine: string,
    fingerprintLine: string,
    userDataLine: string,
): GpgKey {
    const keyId = idLine.split("/")[1].split(" ")[0];
    const userData = userDataLine.replace("uid", "").trim();
    const fingerprint = fingerprintLine
        .replace("Key fingerprint = ", "")
        .split(" ")
        .join("");

    return {
        id: keyId,
        info: userData,
        fingerprint,
    };
}

export function encryptMessage(
    _: any,
    message: string,
    recipients: string[],
): Promise<string> {
    // const gpgCommand = `echo "${message}" | ${gpg(`--encrypt --armor `)}`};
    const gpgCommand = `echo ${message} | ${gpg(`--encrypt --armor ${recipients.map((r) => `-r ${r}`).join(" ")}`)}`;
    return executeCommand(gpgCommand);
}

export function getPublicKey(_: any, keyId: string): Promise<string> {
    const gpgCommand = `gpg --armor --export ${keyId}`;
    return executeCommand(gpgCommand);
}

export function decryptMessage(_: any, message: string): Promise<string> {
    const gpgCommand = `echo "${message}" | ${gpg("--decrypt --armor")}`;
    return executeCommand(gpgCommand);
}
