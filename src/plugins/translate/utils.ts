/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { classNameFactory } from "@utils/css";
import { onlyOnce } from "@utils/onlyOnce";
import { PluginNative } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

import { DeeplLanguages, deeplLanguageToGoogleLanguage, GoogleLanguages } from "./languages";
import { resetLanguageDefaults, settings } from "./settings";

export const cl = classNameFactory("vc-trans-");

const Native = VencordNative.pluginHelpers.Translate as PluginNative<typeof import("./native")>;

interface GoogleData {
    translation: string;
    sourceLanguage: string;
}

interface DeeplData {
    translations: {
        detected_source_language: string;
        text: string;
    }[];
}

interface LibreTranslateData {
    translatedText: string;
    detectedLanguage?: {
        confidence: number;
        language: string;
    };
}

interface LibreLanguageEntry {
    code: string;
    name: string;
    targets?: string[];
}

type LibreLanguagesMap = Record<string, string>;

let cachedLibreLanguages: LibreLanguagesMap | null = null;
let cachedLibreBaseUrl: string | null = null;
let cachedLibreLanguagesPromise: Promise<LibreLanguagesMap | null> | null = null;
const checkedLibreHosts = new Set<string>();

function normalizeLibreBaseUrl(url: string) {
    const normalized = (url || "https://libretranslate.com").trim().replace(/\/+$/, "");
    let parsed: URL;

    try {
        parsed = new URL(normalized);
    } catch {
        throw "Invalid LibreTranslate URL. Use a full URL like https://your-instance.example.";
    }

    if (parsed.protocol !== "https:") {
        throw "LibreTranslate must use HTTPS. HTTP endpoints are blocked by Discord.";
    }

    return parsed.toString().replace(/\/+$/, "");
}

async function ensureLibreTranslateCspAllowed(baseUrl: string) {
    if (IS_WEB) return;

    const { host, origin } = new URL(baseUrl);
    if (checkedLibreHosts.has(host)) return;

    if (await VencordNative.csp.isDomainAllowed(origin, ["connect-src"])) {
        checkedLibreHosts.add(host);
        return;
    }

    const result = await VencordNative.csp.requestAddOverride(origin, ["connect-src"], "Translate");
    switch (result) {
        case "ok":
            throw "LibreTranslate domain was allowed. Please fully restart the app and try again.";
        case "conflict":
            throw "A CSP rule for this domain already exists but does not allow connections. Please update your CSP override.";
        case "cancelled":
        case "unchecked":
            throw "Connection to LibreTranslate was blocked by CSP. Allow the domain when prompted to continue.";
        case "invalid":
        default:
            throw "Invalid LibreTranslate URL.";
    }
}

export async function getLibreTranslateLanguages(): Promise<LibreLanguagesMap | null> {
    if (IS_WEB) return null;

    const baseUrl = normalizeLibreBaseUrl(settings.store.libreTranslateUrl);
    if (cachedLibreLanguages && cachedLibreBaseUrl === baseUrl) return cachedLibreLanguages;
    if (cachedLibreLanguagesPromise && cachedLibreBaseUrl === baseUrl)
        return cachedLibreLanguagesPromise.then(() => cachedLibreLanguages);

    cachedLibreBaseUrl = baseUrl;
    cachedLibreLanguagesPromise = (async () => {
        try {
            await ensureLibreTranslateCspAllowed(baseUrl);

            const res = await fetch(`${baseUrl}/languages`);
            if (!res.ok) throw new Error(`Failed to fetch /languages: ${res.status} ${res.statusText}`);

            const list: LibreLanguageEntry[] = await res.json();
            const entries = list
                .map(l => [l.code, l.name] as const)
                .sort((a, b) => a[1].localeCompare(b[1]));

            cachedLibreLanguages = {
                auto: "Detect language",
                ...Object.fromEntries(entries)
            };
        } catch (e) {
            // Non-blocking: translation can still work and we fall back to raw codes if needed.
            console.warn("[Translate] Failed to load LibreTranslate languages:", e);
            cachedLibreLanguages = null;
        }
        return cachedLibreLanguages;
    })();

    return cachedLibreLanguagesPromise;
}

function googleLanguageToLibreLanguage(language: string) {
    switch (language) {
        case "auto":
            return "auto";
        case "iw":
            return "he";
        case "jw":
            return "jv";
        case "zh-CN":
        case "zh-TW":
            return "zh";
        default:
            return language.split("-")[0].toLowerCase();
    }
}

function libreLanguageToGoogleLanguage(language: string) {
    switch (language) {
        case "he":
            return "iw";
        case "jv":
            return "jw";
        case "zh":
            return "zh-CN";
        default:
            return language;
    }
}

export interface TranslationValue {
    sourceLanguage: string;
    text: string;
}

export const getLanguages = () => {
    if (settings.store.service === "deepl" || settings.store.service === "deepl-pro")
        return DeeplLanguages;

    if (settings.store.service === "libretranslate") {
        // Fire-and-forget (the modal also triggers the fetch).
        void getLibreTranslateLanguages();
        return cachedLibreLanguages ?? GoogleLanguages;
    }

    return GoogleLanguages;
};

export async function translate(kind: "received" | "sent", text: string): Promise<TranslationValue> {
    const translate = IS_WEB || settings.store.service === "google"
        ? googleTranslate
        : settings.store.service === "libretranslate"
            ? libreTranslate
            : deeplTranslate;

    try {
        return await translate(
            text,
            settings.store[`${kind}Input`],
            settings.store[`${kind}Output`]
        );
    } catch (e) {
        const userMessage = typeof e === "string"
            ? e
            : "Something went wrong. If this issue persists, please check the console or ask for help in the support server.";

        showToast(userMessage, Toasts.Type.FAILURE);

        throw e instanceof Error
            ? e
            : new Error(userMessage);
    }
}

async function googleTranslate(text: string, sourceLang: string, targetLang: string): Promise<TranslationValue> {
    const url = "https://translate-pa.googleapis.com/v1/translate?" + new URLSearchParams({
        "params.client": "gtx",
        "dataTypes": "TRANSLATION",
        "key": "AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA", // some google API key
        "query.sourceLanguage": sourceLang,
        "query.targetLanguage": targetLang,
        "query.text": text,
    });

    const res = await fetch(url);
    if (!res.ok)
        throw new Error(
            `Failed to translate "${text}" (${sourceLang} -> ${targetLang})`
            + `\n${res.status} ${res.statusText}`
        );

    const { sourceLanguage, translation }: GoogleData = await res.json();

    return {
        sourceLanguage: GoogleLanguages[sourceLanguage] ?? sourceLanguage,
        text: translation
    };
}

async function libreTranslate(text: string, sourceLang: string, targetLang: string): Promise<TranslationValue> {
    const baseUrl = normalizeLibreBaseUrl(settings.store.libreTranslateUrl);

    const body: Record<string, string> = {
        q: text,
        source: googleLanguageToLibreLanguage(sourceLang || "auto"),
        target: googleLanguageToLibreLanguage(targetLang),
        format: "text"
    };

    // api_key is optional for self-hosted instances, but required on some public ones.
    if (settings.store.libreTranslateApiKey)
        body.api_key = settings.store.libreTranslateApiKey;

    await ensureLibreTranslateCspAllowed(baseUrl);

    const res = await fetch(`${baseUrl}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const extra = await res.text().catch(() => "");
        throw new Error(
            `Failed to translate "${text}" (${sourceLang} -> ${targetLang})`
            + `\n${res.status} ${res.statusText}${extra ? `\n${extra}` : ""}`
        );
    }

    const parsed: LibreTranslateData = await res.json();
    const langCode = parsed.detectedLanguage?.language ?? body.source;

    const langs = await getLibreTranslateLanguages();
    const prettyName = langs?.[langCode]
        ?? GoogleLanguages[libreLanguageToGoogleLanguage(langCode)]
        ?? langCode;

    return {
        sourceLanguage: prettyName,
        text: parsed.translatedText
    };
}

function fallbackToGoogle(text: string, sourceLang: string, targetLang: string): Promise<TranslationValue> {
    return googleTranslate(
        text,
        deeplLanguageToGoogleLanguage(sourceLang),
        deeplLanguageToGoogleLanguage(targetLang)
    );
}

const showDeeplApiQuotaToast = onlyOnce(
    () => showToast("Deepl API quota exceeded. Falling back to Google Translate", Toasts.Type.FAILURE)
);

async function deeplTranslate(text: string, sourceLang: string, targetLang: string): Promise<TranslationValue> {
    if (!settings.store.deeplApiKey) {
        showToast("DeepL API key is not set. Resetting to Google", Toasts.Type.FAILURE);

        settings.store.service = "google";
        resetLanguageDefaults();

        return fallbackToGoogle(text, sourceLang, targetLang);
    }

    // CORS jumpscare
    const { status, data } = await Native.makeDeeplTranslateRequest(
        settings.store.service === "deepl-pro",
        settings.store.deeplApiKey,
        JSON.stringify({
            text: [text],
            target_lang: targetLang,
            source_lang: sourceLang.split("-")[0]
        })
    );

    switch (status) {
        case 200:
            break;
        case -1:
            throw "Failed to connect to DeepL API: " + data;
        case 403:
            throw "Invalid DeepL API key or version";
        case 456:
            showDeeplApiQuotaToast();
            return fallbackToGoogle(text, sourceLang, targetLang);
        default:
            throw new Error(`Failed to translate "${text}" (${sourceLang} -> ${targetLang})\n${status} ${data}`);
    }

    const { translations }: DeeplData = JSON.parse(data);
    const src = translations[0].detected_source_language;

    return {
        sourceLanguage: DeeplLanguages[src] ?? src,
        text: translations[0].text
    };
}
