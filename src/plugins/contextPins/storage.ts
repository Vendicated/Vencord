/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";

export const STORAGE_KEY = "ContextPins_store";
export const STORAGE_VERSION = 1 as const;
export const MAX_NOTE_LENGTH = 2000;
export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 32;

export type PinKey = string;
export type StorageState = "loading" | "ready" | "error";

export interface PinSnapshot {
    messageId: string;
    channelId: string;
    guildId: string | null;
    content: string;
    authorId: string;
    authorName: string;
    channelName: string;
    guildName: string | null;
    messageTimestamp: number;
    attachmentCount: number;
    embedCount: number;
    stickerCount: number;
}

export interface StoredPin extends PinSnapshot {
    note: string;
    tags: string[];
    createdAt: number;
    updatedAt: number;
    revision: number;
}

export interface StoredContextPins {
    version: typeof STORAGE_VERSION;
    pins: Record<PinKey, StoredPin>;
}

export interface PinInput {
    key: PinKey;
    snapshot: PinSnapshot;
    note: string;
    tags: string[];
}

export class ContextPinsStorageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ContextPinsStorageError";
    }
}

export class ContextPinsConflictError extends ContextPinsStorageError {
    constructor() {
        super("This pin changed in another window. Close this editor and try again.");
        this.name = "ContextPinsConflictError";
    }
}

export class ContextPinsLifecycleError extends ContextPinsStorageError {
    constructor() {
        super("Context Pins is no longer active.");
        this.name = "ContextPinsLifecycleError";
    }
}

const logger = new Logger("ContextPins");
const listeners = new Set<() => void>();
const emptyDocument = (): StoredContextPins => ({ version: STORAGE_VERSION, pins: {} });

let currentDocument = emptyDocument();
let storageState: StorageState = "loading";
let storageError: Error | null = null;
let lifecycleGeneration = 0;
let initialization: Promise<void> | null = null;

export function makePinKey(channelId: string, messageId: string): PinKey {
    return `${channelId}:${messageId}`;
}

export function normalizeTags(input: string): { tags: string[]; error?: string; } {
    const tags: string[] = [];
    const seen = new Set<string>();

    for (const rawTag of input.split(",")) {
        const tag = rawTag.trim().replace(/\s+/g, " ");
        if (!tag) continue;

        if (tag.length > MAX_TAG_LENGTH) {
            return { tags: [], error: `Tags must be ${MAX_TAG_LENGTH} characters or fewer.` };
        }

        const normalized = tag.toLocaleLowerCase();
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        tags.push(tag);
    }

    if (tags.length > MAX_TAGS) {
        return { tags: [], error: `You can add up to ${MAX_TAGS} tags.` };
    }

    return { tags };
}

export function normalizeNote(input: string): { note: string; error?: string; } {
    const note = input.replace(/[ \t]+$/gm, "").trim();
    if (note.length > MAX_NOTE_LENGTH) {
        return { note: "", error: `Notes must be ${MAX_NOTE_LENGTH} characters or fewer.` };
    }

    return { note };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSnowflake(value: unknown): value is string;
function isSnowflake(value: unknown, nullable: true): value is string | null;
function isSnowflake(value: unknown, nullable = false): value is string | null {
    if (nullable && value === null) return true;
    return typeof value === "string" && /^\d+$/.test(value);
}

function isFinitePositive(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isFiniteCount(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parsePin(value: unknown): StoredPin {
    if (!isRecord(value)) throw new ContextPinsStorageError("A stored pin is not an object.");

    const {
        messageId,
        channelId,
        guildId,
        content,
        authorId,
        authorName,
        channelName,
        guildName,
        messageTimestamp,
        attachmentCount,
        embedCount,
        stickerCount,
        note,
        tags: rawTags,
        createdAt,
        updatedAt,
        revision,
    } = value;

    if (
        !isSnowflake(messageId) ||
        !isSnowflake(channelId) ||
        !isSnowflake(authorId) ||
        !isSnowflake(guildId, true) ||
        typeof content !== "string" ||
        typeof authorName !== "string" ||
        typeof channelName !== "string" ||
        (guildName !== null && typeof guildName !== "string") ||
        !isFinitePositive(messageTimestamp) ||
        !isFiniteCount(attachmentCount) ||
        !isFiniteCount(embedCount) ||
        !isFiniteCount(stickerCount) ||
        typeof note !== "string" ||
        note.length > MAX_NOTE_LENGTH ||
        !Array.isArray(rawTags) ||
        rawTags.length > MAX_TAGS ||
        rawTags.some(tag => typeof tag !== "string" || !tag.trim() || tag.length > MAX_TAG_LENGTH) ||
        !isFinitePositive(createdAt) ||
        !isFinitePositive(updatedAt) ||
        !isFinitePositive(revision)
    ) {
        throw new ContextPinsStorageError("A stored pin contains invalid data.");
    }

    const tags = normalizeTags(rawTags.join(","));
    if (tags.error || tags.tags.length !== rawTags.length) {
        throw new ContextPinsStorageError("A stored pin contains invalid tags.");
    }

    return {
        messageId,
        channelId,
        guildId,
        content,
        authorId,
        authorName,
        channelName,
        guildName,
        messageTimestamp,
        attachmentCount,
        embedCount,
        stickerCount,
        note,
        tags: tags.tags,
        createdAt,
        updatedAt,
        revision,
    };
}

export function parseDocument(value: unknown): StoredContextPins {
    if (value === undefined) return emptyDocument();
    if (!isRecord(value) || value.version !== STORAGE_VERSION || !isRecord(value.pins)) {
        throw new ContextPinsStorageError("Context Pins storage uses an unsupported schema version.");
    }

    const pins: Record<PinKey, StoredPin> = {};
    for (const [key, valueForKey] of Object.entries(value.pins)) {
        const pin = parsePin(valueForKey);
        if (key !== makePinKey(pin.channelId, pin.messageId)) {
            throw new ContextPinsStorageError("A stored pin has an invalid key.");
        }
        pins[key] = pin;
    }

    return { version: STORAGE_VERSION, pins };
}

function emit() {
    listeners.forEach(listener => listener());
}

function requireActive(requestGeneration: number) {
    if (requestGeneration !== lifecycleGeneration) throw new ContextPinsLifecycleError();
}

function isStorageReady() {
    return storageState === "ready";
}

async function waitUntilReady(requestGeneration: number) {
    requireActive(requestGeneration);
    if (isStorageReady()) return;
    if (initialization) await initialization;
    requireActive(requestGeneration);
    if (isStorageReady()) return;
    throw storageError ?? new ContextPinsStorageError("Context Pins storage is unavailable.");
}

export function startStorage() {
    const requestGeneration = ++lifecycleGeneration;
    currentDocument = emptyDocument();
    storageState = "loading";
    storageError = null;
    emit();

    initialization = DataStore.get<unknown>(STORAGE_KEY)
        .then(value => {
            requireActive(requestGeneration);
            currentDocument = parseDocument(value);
            storageState = "ready";
            emit();
        })
        .catch(error => {
            if (requestGeneration !== lifecycleGeneration) return;

            storageState = "error";
            storageError = error instanceof Error ? error : new ContextPinsStorageError("Failed to load Context Pins storage.");
            logger.error("Failed to load storage", error);
            emit();
            throw storageError;
        });

    return initialization;
}

export function stopStorage() {
    lifecycleGeneration++;
    initialization = null;
    currentDocument = emptyDocument();
    storageState = "loading";
    storageError = null;
    listeners.clear();
}

export function getStorageState() {
    return storageState;
}

export function getStorageError() {
    return storageError;
}

export function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getPins() {
    return Object.values(currentDocument.pins);
}

export function getPin(key: PinKey) {
    return currentDocument.pins[key];
}

export async function upsertPin(input: PinInput, expectedRevision: number | null) {
    const requestGeneration = lifecycleGeneration;
    await waitUntilReady(requestGeneration);

    let nextDocument: StoredContextPins | undefined;
    let nextPin: StoredPin | undefined;
    await DataStore.update<unknown>(STORAGE_KEY, oldValue => {
        requireActive(requestGeneration);
        const document = parseDocument(oldValue);
        const existing = document.pins[input.key];

        if (expectedRevision === null ? existing : existing?.revision !== expectedRevision) {
            throw new ContextPinsConflictError();
        }

        const now = Date.now();
        nextPin = {
            ...input.snapshot,
            note: input.note,
            tags: [...input.tags],
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            revision: (existing?.revision ?? 0) + 1,
        };
        document.pins[input.key] = nextPin;
        nextDocument = document;
        return document;
    });

    requireActive(requestGeneration);
    currentDocument = nextDocument!;
    emit();
    return nextPin!;
}

export async function deletePin(key: PinKey, expectedRevision: number) {
    const requestGeneration = lifecycleGeneration;
    await waitUntilReady(requestGeneration);

    let nextDocument: StoredContextPins | undefined;
    await DataStore.update<unknown>(STORAGE_KEY, oldValue => {
        requireActive(requestGeneration);
        const document = parseDocument(oldValue);
        const existing = document.pins[key];
        if (!existing || existing.revision !== expectedRevision) throw new ContextPinsConflictError();

        delete document.pins[key];
        nextDocument = document;
        return document;
    });

    requireActive(requestGeneration);
    currentDocument = nextDocument!;
    emit();
}
