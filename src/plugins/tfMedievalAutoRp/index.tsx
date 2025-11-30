/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
// import { Heading } from "@components/Heading";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Button, React, Text, TextInput, useState } from "@webpack/common";

import autorpRaw from "./Autorp";
import { MedievalChatBarButton } from "./MedievalChatBarButton";
import { MedievalIcon } from "./MedievalIcon";

export const pluginName: string = "TF2 Old English Translator";

interface ReplacementRule {
    prev?: string[];
    word?: string[];
    word_plural?: string[];
    replacement: string[];
    replacement_plural?: string[];
    replacement_prepend?: string[];
    chance?: number;
    prepend_count?: number;
}

interface ParsedData {
    prepended_words: Record<string, number>;
    appended_words: Record<string, number>;
    word_replacements: ReplacementRule[];
}

interface Token {
    type: "word" | "punct" | "space";
    value: string;
    start: number;
    lower?: string;
}

// Global state for the plugin
let data: ParsedData | null = null;
let forwardCategories: Record<string, string[]> = {};

// Reverse lookup structures
let reverseMap: Map<string, string[]> | null = null;
let reversePhrases: string[] = [];
let prefixRegexes: RegExp[] = [];
let suffixRegexes: RegExp[] = [];

export const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable the plugin",
        default: true
    },
    resetDefaults: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => (
            <Button
                color={Button.Colors.PRIMARY}
                look={Button.Looks.FILLED}
                size={Button.Sizes.SMALL}
                onClick={() => {
                    Object.entries(settings.def).forEach(([key, def]) => {
                        if (["enabled", "resetDefaults", "preview", "previewHeader"].includes(key)) return;
                        settings.store[key] = (def as any).default;
                    });
                    settings.store.translationMode = "forward"; // workaround for chatbar icon colour status
                }}
                style={{ marginTop: 8 }}
            >
                Reset to Defaults
            </Button>
        )
    },
    translationMode: {
        type: OptionType.SELECT,
        description: "Direction of chat translation",
        options: [
            { label: "Forward Translation (modern → medieval)", value: "forward", default: true },
            { label: "Reverse Translation (medieval → modern)", value: "reverse" },
            { label: "Disabled", value: "disabled" }
        ]
    },
    prefixProb: {
        type: OptionType.NUMBER,
        description: "Probability to add prepended phrase (0-1)",
        default: 0.8,
        componentProps: { step: 0.01, min: 0, max: 1 }
    },
    suffixProb: {
        type: OptionType.NUMBER,
        description: "Probability to add appended phrase (0-1)",
        default: 0.8,
        componentProps: { step: 0.01, min: 0, max: 1 }
    },
    replacementProb: {
        type: OptionType.NUMBER,
        description: "Global multiplier for replacements' chance (0-1)",
        default: 0.8,
        componentProps: { step: 0.01, min: 0.01, max: 1 }
    },
    wordChoice: {
        type: OptionType.SELECT,
        description: "Vocabulary preference for translation",
        options: [
            { label: "Random (default)", value: "random", default: true },
            { label: "Prefer shorter words", value: "short" },
            { label: "Prefer longer words", value: "long" }
        ]
    },
    punctuationStyle: {
        type: OptionType.SELECT,
        description: "How to handle prefix/suffix punctuation",
        options: [
            { label: "Auto (append comma when none)", value: "auto", default: true },
            { label: "Preserve existing punctuation", value: "preserve" },
            { label: "Force comma after prefix", value: "forceComma" }
        ]
    },
    capitalisation: {
        type: OptionType.SELECT,
        description: "Capitalisation behaviour after prefix punctuation",
        options: [
            { label: "Auto (capitalise after '!')", value: "auto", default: true },
            { label: "Always capitalise after prefix", value: "always" },
            { label: "Never change capitalisation", value: "none" }
        ]
    },
    previewHeader: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => <Text variant="heading-lg/semibold" className={classes(Margins.top8)}>Preview</Text> // <Heading tag="h2">Preview</Heading>
    },
    reverseEnabled: {
        type: OptionType.BOOLEAN,
        description: "Use reverse transform in preview",
        default: false
    },
    preview: {
        type: OptionType.COMPONENT,
        component: () => {
            const { replacementProb, prefixProb, suffixProb, punctuationStyle, capitalisation, lowerCase, reverseEnabled, wordChoice, skipCodeBlocks, skipQuotes } = settings.use(["replacementProb", "prefixProb", "suffixProb", "punctuationStyle", "capitalisation", "lowerCase", "reverseEnabled", "wordChoice"] as const) as any;
            const [src, setSrc] = useState("");
            const out = React.useMemo(() => {
                try {
                    return reverseEnabled ? reverseTransform(src) : transform(src);
                } catch {
                    return "";
                }
            }, [src, reverseEnabled, replacementProb, prefixProb, suffixProb, punctuationStyle, capitalisation, lowerCase, wordChoice, skipCodeBlocks, skipQuotes]);
            return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
                React.createElement(TextInput, { placeholder: "Type text to preview", value: src, onChange: (v: any) => setSrc(v) }),
                React.createElement(TextInput, { placeholder: "Preview output", value: out, disabled: true })
            );
        },
    },
    lowerCase: {
        type: OptionType.BOOLEAN,
        description: "Enforce lower-case for entire message",
        default: false
    },
    skipCodeBlocks: {
        type: OptionType.BOOLEAN,
        description: "Skip Markdown code blocks and inline code when transforming",
        default: true
    },
    skipQuotes: {
        type: OptionType.BOOLEAN,
        description: "Skip blockquote lines (starting with '>') when transforming",
        default: true
    },
    showChatBarIcon: {
        type: OptionType.BOOLEAN,
        description: "Show Medieval Translator button in chatbar",
        default: true
    }
});

// --- HELPER FUNCTIONS ---

function esc(s: string) {
    return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function pickRandom<T>(arr: T[]): T {
    if (!arr || arr.length === 0) return undefined as any;
    return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(items: [string, number][]): string {
    const total = items.reduce((sum, [, weight]) => sum + weight, 0);
    let r = Math.random() * total;
    for (const [item, weight] of items) {
        r -= weight;
        if (r <= 0) return item;
    }
    return items[0][0];
}

function matchCase(source: string, target: string) {
    if (!source || !target) return target;
    // if ALL CAPS — only when source contains letters
    if (/[A-Za-z]/.test(source) && source === source.toUpperCase()) return target.toUpperCase();
    // if first letter is uppercase
    if (/[A-Z]/.test(source[0])) return target.charAt(0).toUpperCase() + target.slice(1);
    return target;
}

function tokenize(msg: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < msg.length) {
        if (/\s/.test(msg[i])) {
            let j = i;
            while (j < msg.length && /\s/.test(msg[j])) j++;
            tokens.push({ type: "space", value: msg.slice(i, j), start: i });
            i = j;
            continue;
        }
        if (/[a-z]/i.test(msg[i]) || /\d/.test(msg[i]) || msg[i] === "'") {
            let j = i;
            while (j < msg.length && (/[a-z]/i.test(msg[j]) || /\d/.test(msg[j]) || msg[j] === "_" || msg[j] === "'")) j++;
            const val = msg.slice(i, j);
            tokens.push({ type: "word", value: val, start: i, lower: val.toLowerCase() });
            i = j;
            continue;
        }
        // punct
        let j = i;
        while (j < msg.length && !/\s|[a-z]/i.test(msg[j]) && !/\d/.test(msg[j])) j++;
        tokens.push({ type: "punct", value: msg.slice(i, j), start: i, lower: msg.slice(i, j).toLowerCase() });
        i = j;
    }
    return tokens;
}

// --- DATA PARSING & INIT ---

function parse(text: string): ParsedData {
    const rawLines = text.split(/\r?\n/).map(l => l.trim());
    const result: ParsedData = {
        prepended_words: {},
        appended_words: {},
        word_replacements: []
    };

    function unquote(s: string) {
        return s.replace(/^"(.*)"$/, "$1");
    }

    const tokenizeLine = (line: string) => {
        const toks: string[] = [];
        const re = /"([^"]+)"|(\S+)/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(line)) !== null) {
            toks.push(m[1] ?? m[2]);
        }
        return toks;
    };

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        if (!line || line === "\"autorp.txt\"" || line === "{") continue;

        if (line === "\"prepended_words\"") {
            i++;
            while (i + 1 < rawLines.length) {
                i++;
                const l = rawLines[i];
                if (!l) continue;
                if (l === "}") break;
                const toks = tokenizeLine(l);
                if (toks.length >= 2) {
                    const phrase = toks.slice(0, toks.length - 1).join(" ");
                    const weight = Number(toks[toks.length - 1]);
                    if (!Number.isNaN(weight)) result.prepended_words[unquote(phrase)] = weight;
                }
            }
            continue;
        }

        if (line === "\"appended_words\"") {
            i++;
            while (i + 1 < rawLines.length) {
                i++;
                const l = rawLines[i];
                if (!l) continue;
                if (l === "}") break;
                const toks = tokenizeLine(l);
                if (toks.length >= 2) {
                    const phrase = toks.slice(0, toks.length - 1).join(" ");
                    const weight = Number(toks[toks.length - 1]);
                    if (!Number.isNaN(weight)) result.appended_words[unquote(phrase)] = weight;
                }
            }
            continue;
        }

        if (line === "\"word_replacements\"") {
            i++;
            while (i + 1 < rawLines.length) {
                i++;
                let l = rawLines[i];
                if (!l) continue;
                if (l === "}") break;

                if (l === "\"1\"") {
                    i++;
                    const rule: Partial<ReplacementRule> = {};
                    while (i + 1 < rawLines.length) {
                        i++;
                        l = rawLines[i];
                        if (!l) continue;
                        if (l === "}") break;
                        const toks = tokenizeLine(l);
                        if (toks.length < 2) continue;
                        const key = toks[0];
                        const val = toks.slice(1).join(" ");
                        if (key === "chance" || key === "prepend_count") {
                            const n = Number(val);
                            if (!Number.isNaN(n)) (rule as any)[key] = n;
                        } else if (key === "replacement" || key === "replacement_plural" || key === "replacement_prepend" || key === "word" || key === "word_plural" || key === "prev") {
                            const arr = ((rule as any)[key] as string[]) || [];
                            arr.push(unquote(val));
                            (rule as any)[key] = arr;
                        } else {
                            (rule as any)[key] = unquote(val);
                        }
                    }
                    if ((rule.replacement && (rule.replacement as string[]).length) || (rule.word && (rule.word as string[]).length)) {
                        result.word_replacements.push(rule as ReplacementRule);
                    }
                }
            }
            continue;
        }
    }

    return result;
}

function getCategories(rules: ReplacementRule[]): Record<string, string[]> {
    const cats: Record<string, string[]> = {};
    for (const rule of rules) {
        const words = rule.word || [];
        if (Array.isArray(words)) {
            for (const w of words) {
                if (typeof w === "string") {
                    cats[w.toLowerCase()] = rule.replacement;
                }
            }
        } else if (typeof words === "string") {
            cats[(words as string).toLowerCase()] = rule.replacement;
        }
    }
    return cats;
}

// Pre-build a map of "Word -> [List of possible replacements]"
// This is used for generating the regex for the reverse prefix matcher.
// e.g. "the" -> ["ye", "i' the"]
function buildForwardReplacementMap(rules: ReplacementRule[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const rule of rules) {
        const targets = [...(rule.word || []), ...(rule.word_plural || [])];
        const replacements = [...(rule.replacement || []), ...(rule.replacement_plural || [])];

        for (const t of targets) {
            const low = t.toLowerCase();
            if (!map.has(low)) map.set(low, []);
            const list = map.get(low)!;
            for (const r of replacements) {
                if (!list.includes(r)) list.push(r);
            }
        }
    }
    return map;
}

// Compile a prefix/suffix template into a Regex that matches:
// 1. Literal words (e.g. "By")
// 2. Transformed literal words (e.g. "the" becoming "ye" inside the prefix)
// 3. Variables (e.g. "&god" becoming "Odin", "Zeus", etc)
function compileTemplateToRegex(template: string, variableMap: Record<string, string[]>, forwardReplacements: Map<string, string[]>, anchorStart: boolean): RegExp {
    const parts: string[] = [];
    let lastIndex = 0;
    // Tokenizer regex: matches variables (&name) or words (letters, numbers, apostrophes)
    const re = /(&\w+)|([a-zA-Z0-9']+)/g;
    let match: RegExpExecArray | null;

    while ((match = re.exec(template)) !== null) {
        if (match.index > lastIndex) {
            // Match any non-word characters (space, punctuation, hyphens, etc) between tokens
            // This fixes issues where templates have hyphens (Heigh-ho) or specific punctuation
            parts.push("[\\W]+");
        }

        const full = match[0];
        const isVar = !!match[1];
        const word = match[2];

        if (isVar) {
            const varName = full.slice(1).toLowerCase();
            const possibilities = variableMap[varName];
            if (possibilities && possibilities.length > 0) {
                // Sort by length desc to ensure longest match first (e.g. "Liver and Lights" before "Liver")
                const sorted = [...possibilities].sort((a, b) => b.length - a.length);
                const group = "(?:" + sorted.map(esc).join("|") + ")";
                parts.push(group);
            } else {
                parts.push("\\S+");
            }
        } else {
            const variants = [word];
            const repls = forwardReplacements.get(word.toLowerCase());
            if (repls) {
                // repls is already an array, push items
                repls.forEach(r => { if (!variants.includes(r)) variants.push(r); });
            }
            // Sort by length desc
            variants.sort((a, b) => b.length - a.length);
            const group = "(?:" + variants.map(esc).join("|") + ")";
            parts.push(group);
        }

        lastIndex = match.index + full.length;
    }

    if (lastIndex < template.length) {
        // Handle trailing punctuation in template
        parts.push("[\\W]*");
    }

    const pattern = parts.join("");

    if (anchorStart) {
        // Prefix: consume aggressively at end
        return new RegExp(`^\\s*${pattern}[\\s,;!?]*`, "i");
    } else {
        // Suffix: consume conservatively at start (only comma/space) to preserve sentence punctuation like '!'
        return new RegExp(`[\\s,]*${pattern}\\s*$`, "i");
    }
}

function buildReverseStructures() {
    if (!data) return;
    if (reverseMap) return;

    // 1. Build Reverse Word Map (Medieval -> Modern[])
    const map = new Map<string, string[]>();

    for (const rule of data.word_replacements) {
        // Context-aware replacement (prev + word)
        if (rule.prev && rule.prev.length > 0 && rule.word && rule.word.length > 0) {
            const fullOriginal = `${rule.prev[0]} ${rule.word[0]}`;
            for (const repl of rule.replacement) {
                if (repl.trim()) {
                    const key = repl.toLowerCase();
                    if (!map.has(key)) map.set(key, []);
                    map.get(key)!.push(fullOriginal);
                }
            }
            continue;
        }

        // Standard replacement
        const originals = rule.word ? [...rule.word] : [];
        const originalsPlural = rule.word_plural ? [...rule.word_plural] : [];
        if (originals.length === 0 && originalsPlural.length === 0) continue;

        const originalSingular = originals.length ? originals[0] : (originalsPlural.length ? originalsPlural[0] : "");
        const originalPlural = originalsPlural.length ? originalsPlural[0] : null;

        const replSingulars: string[] = rule.replacement ? [...rule.replacement] : [];
        const replPlurals: string[] = rule.replacement_plural ? [...rule.replacement_plural] : [];

        // Singular mapping: all originals to each repl
        for (const r of replSingulars) {
            if (r && r.trim()) {
                const key = r.toLowerCase();
                if (!map.has(key)) map.set(key, []);
                for (const orig of originals) {
                    if (!map.get(key)!.includes(orig)) map.get(key)!.push(orig);
                }
            }
        }
        // Plural mapping: all plural originals to each replPlural
        for (const r of replPlurals) {
            if (r && r.trim()) {
                const key = r.toLowerCase();
                if (!map.has(key)) map.set(key, []);
                for (const orig of originalsPlural) {
                    if (!map.get(key)!.includes(orig)) map.get(key)!.push(orig);
                }
                // Fallback to singular originals if no plural
                if (originalsPlural.length === 0) {
                    for (const orig of originals) {
                        if (!map.get(key)!.includes(orig)) map.get(key)!.push(orig);
                    }
                }
            }
        }

        // Prepend mapping: all originals to each prepend+repl combo
        if (rule.replacement_prepend && rule.replacement_prepend.length > 0) {
            for (const prepend of rule.replacement_prepend) {
                for (const r of replSingulars) {
                    const combined = `${prepend} ${r}`.toLowerCase();
                    if (combined.trim()) {
                        if (!map.has(combined)) map.set(combined, []);
                        for (const orig of originals) {
                            if (!map.get(combined)!.includes(orig)) map.get(combined)!.push(orig);
                        }
                    }
                }
                for (const r of replPlurals) {
                    const combined = `${prepend} ${r}`.toLowerCase();
                    if (combined.trim()) {
                        if (!map.has(combined)) map.set(combined, []);
                        for (const orig of originalsPlural) {
                            if (!map.get(combined)!.includes(orig)) map.get(combined)!.push(orig);
                        }
                        if (originalsPlural.length === 0) {
                            for (const orig of originals) {
                                if (!map.get(combined)!.includes(orig)) map.get(combined)!.push(orig);
                            }
                        }
                    }
                }
            }
        }
    }
    reverseMap = map;
    reversePhrases = Array.from(map.keys()).sort((a, b) => b.length - a.length);

    // 2. Build Regexes for Prefixes and Suffixes
    // We need to account for forward transformations happening INSIDE the prefix/suffix.
    forwardCategories = getCategories(data.word_replacements);
    const forwardReplacementsMap = buildForwardReplacementMap(data.word_replacements);

    const prefKeys = Object.keys(data.prepended_words || {}).sort((a, b) => b.length - a.length);
    prefixRegexes = prefKeys.map(template => compileTemplateToRegex(template, forwardCategories, forwardReplacementsMap, true));

    const sufKeys = Object.keys(data.appended_words || {}).sort((a, b) => b.length - a.length);
    suffixRegexes = sufKeys.map(template => compileTemplateToRegex(template, forwardCategories, forwardReplacementsMap, false));
}

// --- TRANSFORM LOGIC ---

function expandPlaceholders(phrase: string, categories: Record<string, string[]>): string {
    return phrase.replace(/&(\w+)/g, (_, varName) => {
        const repls = categories[varName];
        return repls ? pickRandom(repls) : phrase;
    });
}

function applyReplacements(msg: string, categories: Record<string, string[]>, options: { skipPunctuation?: boolean; } = {}): string {
    if (!data) return msg;
    const tokens = tokenize(msg);
    const newTokens = tokens.map(t => ({ ...t }));

    // iterate left-to-right and apply first matching rule per token
    for (let pos = 0; pos < newTokens.length; pos++) {
        const token = newTokens[pos];
        if (!token || token.type === "space" || !token.value) continue;

        // SKIP PUNCTUATION REPLACEMENT if requested (e.g. for prefixes like "Hark!")
        if (options.skipPunctuation && token.type === "punct") continue;

        const findPrev = (idx: number) => {
            for (let j = idx - 1; j >= 0; j--) {
                if (newTokens[j].type !== "space" && newTokens[j].value) return j;
            }
            return -1;
        };

        for (const rule of data.word_replacements) {
            const ruleChanceRaw = Number(rule.chance ?? 1) || 1;
            const ruleClamped = Math.max(1, Math.min(4, Math.floor(ruleChanceRaw)));
            const ruleFactor = ruleClamped;
            const globalFactor = Number(settings.store.replacementProb ?? 1.0) || 1.0;
            const effective = Math.min(1, Math.max(0, ruleFactor * globalFactor));
            if (Math.random() > effective) continue;

            const lower = token.lower ?? token.value.toLowerCase();
            let match = false;
            let isPlural = false;
            if (rule.word && (rule.word as string[]).some(w => lower === w.toLowerCase())) match = true;
            else if (rule.word_plural && (rule.word_plural as string[]).some(w => lower === w.toLowerCase())) { match = true; isPlural = true; }
            if (!match) continue;

            const prevNeeded = Array.isArray(rule.prev) && rule.prev.length > 0;
            let prevIdx = -1;
            if (prevNeeded) {
                prevIdx = findPrev(pos);
                if (prevIdx < 0) continue;
                const prevLower = newTokens[prevIdx].lower ?? newTokens[prevIdx].value.toLowerCase();
                const prevOk = (rule.prev as string[]).some(p => prevLower === p.toLowerCase());
                if (!prevOk) continue;
            }

            const repls = isPlural ? (rule.replacement_plural as string[]) || rule.replacement! : rule.replacement!;
            if (!repls || !repls.length) continue;

            // --- WORD CHOICE PREFERENCE ---
            let choices = [...repls];
            const pref = settings.store.wordChoice ?? "random";
            if (pref !== "random" && choices.length > 4) {
                // Sort by length ascending (shortest first)
                choices.sort((a, b) => a.length - b.length);
                const half = Math.ceil(choices.length / 2);
                if (pref === "short") {
                    choices = choices.slice(0, half);
                } else if (pref === "long") {
                    // slice last half (longest)
                    choices = choices.slice(choices.length - half);
                }
            }

            let repl = pickRandom(choices);

            if (rule.replacement_prepend && (rule.replacement_prepend as string[]).length) {
                const adjs = rule.replacement_prepend as string[];
                const count = Math.max(1, Math.min(5, Math.floor(rule.prepend_count ?? 1)));
                const picked: string[] = [];
                for (let k = 0; k < count; k++) picked.push(pickRandom(adjs));
                repl = picked.join(" ") + " " + repl;
            }

            const sourceForCase = prevNeeded && prevIdx >= 0 ? newTokens[prevIdx].value : token.value;
            repl = matchCase(sourceForCase, repl);

            if (prevNeeded && prevIdx >= 0) {
                newTokens[prevIdx] = { ...newTokens[prevIdx], value: repl, lower: repl.toLowerCase() };
                newTokens[pos] = { ...newTokens[pos], value: "", lower: "" };
            } else {
                newTokens[pos] = { ...newTokens[pos], value: repl, lower: repl.toLowerCase() };
            }

            break;
        }
    }

    let out = "";
    let lastType: "word" | "punct" | "space" | null = null;
    const specialPunct = new Set(["**", "__", "~~", "*", "_", "`"]);
    for (let i = 0; i < newTokens.length; i++) {
        const t = newTokens[i];
        if (!t.value) continue;
        if (t.type === "space") {
            if (lastType !== "space") out += " ";
            lastType = "space";
            continue;
        }
        if (t.type === "punct") {
            const isSpecial = specialPunct.has(t.value) || /[\uE000-\uF8FF]/.test(t.value);
            if (lastType === "word" && !isSpecial) out = out.trimEnd();
            out += t.value;
            lastType = "punct";
            continue;
        }
        if (lastType === "word") out += " ";
        out += t.value;
        lastType = "word";
    }
    return out.trim();
}

function transformCore(msg: string): string {
    if (!data) return msg;
    if (Object.keys(forwardCategories).length === 0) {
        forwardCategories = getCategories(data.word_replacements);
    }

    let p = "";
    let s = "";
    let body = msg.trimStart();
    const pluginSettings = settings.store;

    // 1. Generate Prefix (Apply word replacements but SKIP punctuation replacements to prevent "Hark!" -> "! Hear Hear")
    if (pluginSettings?.enabled && Math.random() < (pluginSettings.prefixProb ?? 0.8)) {
        const prefixes = Object.entries(data.prepended_words);
        if (prefixes.length) {
            const rawPrefix = weightedPick(prefixes.map(([phr, w]) => [expandPlaceholders(phr, forwardCategories), w] as [string, number]));

            // Transform words inside prefix (e.g. "the" -> "ye") but NOT punctuation
            p = applyReplacements(rawPrefix, forwardCategories, { skipPunctuation: true }).trim();

            const punctuationSetting = settings.store.punctuationStyle ?? "auto";
            const hasPunct = /[!,.?:;]$/.test(p);

            if (punctuationSetting === "forceComma") {
                if (!p.endsWith(",")) p += ",";
            } else if (punctuationSetting === "auto") {
                if (!hasPunct) p += ",";
            }
        }
    }

    // 2. Transform Body (Standard replacements)
    // Capitalize body if prefix ended in ! or ?
    // We check `p` before we attach it.
    const capitalisationSetting = settings.store.capitalisation ?? "auto";
    if (p) {
        // Check the *last non-space* char of p
        const trimmedP = p.trimEnd();
        const endChar = trimmedP[trimmedP.length - 1];
        if (capitalisationSetting === "always") {
            if (body.length) body = body[0].toUpperCase() + body.slice(1);
        } else if (capitalisationSetting === "auto") {
            if (endChar === "!" || endChar === "?" || endChar === ".") {
                if (body.length) body = body[0].toUpperCase() + body.slice(1);
            }
        }
    }

    body = applyReplacements(body, forwardCategories);

    // 3. Generate Suffix
    if (Math.random() < (pluginSettings.suffixProb ?? 0.8)) {
        const suffixes = Object.entries(data.appended_words);
        if (suffixes.length) {
            const rawSuffix = weightedPick(suffixes.map(([phr, w]) => [expandPlaceholders(phr, forwardCategories), w] as [string, number]));
            // Also skip punctuation replacement in suffixes to be safe
            s = applyReplacements(rawSuffix, forwardCategories, { skipPunctuation: true });
        }
    }

    // 4. Combine
    let result = body;
    if (p) {
        result = p + " " + result;
    }
    if (s) {
        result = result.trimEnd();
        const last = result[result.length - 1] || " ";
        if (last === "," || last === "." || last === "!" || last === "?" || last === ";") {
            result += " " + s;
        } else {
            result += ", " + s;
        }
    }

    return result;
}

function transform(msg: string): string {
    let result = (() => {
        if (!textHasContent(msg)) return msg;
        const skipCode = Boolean(settings.store?.skipCodeBlocks);
        const skipQuotes = Boolean(settings.store?.skipQuotes);
        if (skipCode || skipQuotes) return applyWithSkips(msg, transformCore);
        return transformCore(msg);
    })();
    if (settings.store?.lowerCase) result = result.toLowerCase();
    return result;
}

// --- REVERSE TRANSFORM LOGIC ---

function reverseCore(text: string): string {
    if (!data) return text;
    buildReverseStructures();
    if (!reverseMap) return text;

    let work = text;

    // 1. Remove Prefixes (using pre-compiled dynamic regexes)
    try {
        for (const regex of prefixRegexes) {
            if (regex.test(work)) {
                work = work.replace(regex, "").trimStart();
                break; // Only remove one prefix
            }
        }

        // 2. Remove Suffixes
        for (const regex of suffixRegexes) {
            const match = work.match(regex);
            if (match) {
                // Remove suffix, preserve preceding comma if it wasn't part of suffix match logic
                const suffixStart = match.index!;
                const preceding = work.slice(0, suffixStart).trimEnd();
                const cleanPreceding = preceding.endsWith(",") ? preceding.slice(0, -1).trimEnd() : preceding;
                work = cleanPreceding + work.slice(suffixStart + match[0].length).trimStart();
                break;
            }
        }
    } catch (e) {
        work = text;
    }

    // 3. Reverse Replacements
    let newResult = "";
    let i = 0;
    while (i < work.length) {
        let foundMatch = false;
        if (!/[\uE000-\uF8FF]/.test(work.slice(i, i + 1))) {
            for (const phrase of reversePhrases) {
                // Bounds checks
                const end = i + phrase.length;
                if (end > work.length) continue;

                if (work.substring(i, end).toLowerCase() === phrase) {
                    // Boundary Logic:
                    // If phrase starts with a word char, we need a word boundary before it.
                    // If phrase starts with non-word (e.g. punctuation), we generally don't need a space before it.
                    const phraseStartsWord = /[a-zA-Z0-9']/.test(phrase[0]);
                    const phraseEndsWord = /[a-zA-Z0-9']/.test(phrase[phrase.length - 1]);

                    const beforeBoundary = !phraseStartsWord || (i === 0 || !/[a-zA-Z0-9']/.test(work.charAt(i - 1)));
                    const afterBoundary = !phraseEndsWord || (end === work.length || !/[a-zA-Z0-9']/.test(work.charAt(end)));

                    if (beforeBoundary && afterBoundary) {
                        const originalOptions = reverseMap.get(phrase)!;
                        // RANDOM VARIABILITY: Pick a random original source word if multiple exist
                        const original = pickRandom(originalOptions);

                        const originalCase = matchCase(work.substring(i, end), original);
                        newResult += originalCase;
                        i = end;
                        foundMatch = true;
                        break;
                    }
                }
            }
        }
        if (!foundMatch) {
            newResult += work[i];
            i++;
        }
    }
    work = newResult;

    return work.replace(/\s{2,}/g, " ").trim();
}

export function reverseTransform(text: string): string {
    let result = (() => {
        if (!text || !text.trim()) return "";
        if (!data) return text;

        const skipCode = Boolean(settings.store?.skipCodeBlocks);
        const skipQuotes = Boolean(settings.store?.skipQuotes);
        if (skipCode || skipQuotes) return applyWithSkips(text, reverseCore);
        return reverseCore(text);
    })();
    if (settings.store?.lowerCase) result = result.toLowerCase();
    return result;
}

// --- UTILS ---

function applyWithSkips(text: string, fn: (s: string) => string): string {
    const skipCode = Boolean(settings.store?.skipCodeBlocks);
    const skipQuotes = Boolean(settings.store?.skipQuotes);

    const lines = text.split(/\n/);
    let inFence = false;
    const outParts: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trimStart();

        if (trimmed.startsWith("```")) {
            outParts.push(line);
            inFence = !inFence;
            continue;
        }
        if (inFence) {
            outParts.push(line);
            continue;
        }

        if (skipQuotes && trimmed.startsWith(">")) {
            outParts.push(line);
            continue;
        }

        if (skipCode && (line.includes("`") || line.includes("**") || line.includes("__") || line.includes("~~") || line.includes("*") || line.includes("_"))) {
            const codeFragments: string[] = [];
            const re = /(`+)([\s\S]*?)\1|(\*\*|__|~~|\*|_)([\s\S]*?)\3/g;
            let last = 0;
            let m: RegExpExecArray | null;
            let idx = 0;
            const pieces: string[] = [];
            while ((m = re.exec(line)) !== null) {
                if (m.index > last) {
                    pieces.push(line.slice(last, m.index));
                }
                const fullMatch = m[0];
                if (m[1]) {
                    if (skipCode) {
                        const start = String.fromCharCode(0xF000);
                        const mid = String.fromCharCode(0xE010 + (idx % 0x100));
                        const end = String.fromCharCode(0xF001);
                        const placeholder = start + mid + end;
                        codeFragments.push(fullMatch);
                        pieces.push(placeholder);
                        idx++;
                    } else {
                        const content = m[2];
                        const translated = fn(content);
                        const reconstructed = m[1] + translated + m[1];
                        pieces.push(reconstructed);
                    }
                } else {
                    const content = m[4];
                    let translated: string;
                    if (fn === reverseCore) {
                        translated = fn(content);
                    } else {
                        // For forward transform in emphasis, don't re-apply prefixes
                        if (Object.keys(forwardCategories).length === 0 && data) forwardCategories = getCategories(data.word_replacements);
                        translated = applyReplacements(content, forwardCategories);
                    }
                    const reconstructed = m[3] + translated + m[3];
                    const start = String.fromCharCode(0xF000);
                    const mid = String.fromCharCode(0xE010 + (idx % 0x100));
                    const end = String.fromCharCode(0xF001);
                    const placeholder = start + mid + end;
                    codeFragments.push(reconstructed);
                    pieces.push(placeholder);
                    idx++;
                }
                last = m.index + fullMatch.length;
            }
            if (last < line.length) pieces.push(line.slice(last));
            const temp = pieces.join("");
            const transformed = fn(temp);
            let restored = transformed;
            for (let i = 0; i < codeFragments.length; i++) {
                const start = String.fromCharCode(0xF000);
                const mid = String.fromCharCode(0xE010 + (i % 0x100));
                const end = String.fromCharCode(0xF001);
                const ph = start + mid + end;
                restored = restored.split(ph).join(codeFragments[i]).replace(/\\s{2,}/g, " ").trim();
            }
            outParts.push(restored);
            continue;
        }

        outParts.push(fn(line));
    }

    return outParts.join("\n");
}

function textHasContent(s: string) {
    return Boolean(s && s.trim());
}

export default definePlugin({
    name: pluginName,
    description: "Automatically translates your Discord chat messages into medieval English using the Team Fortress 2 'autorp.txt' dictionary. Prefixes, suffixes, and word replacements with chances and conditions are supported.",
    authors: [Devs.nfsmaniac],
    settings,
    chatBarButton: {
        render: MedievalChatBarButton,
        icon: MedievalIcon
    },
    start() {
        try {
            if (autorpRaw && typeof autorpRaw === "string") {
                data = parse(autorpRaw);
                // Pre-build structures immediately to ensure responsiveness
                buildReverseStructures();

                const prefixes = Object.keys(data.prepended_words || {});
                const suffixes = Object.keys(data.appended_words || {});
                const replacements = data.word_replacements || [];
                console.log("TFMedievalAutoRp: loaded data — prefixes=%d suffixes=%d replacements=%d", prefixes.length, suffixes.length, replacements.length);
            }
        } catch (e) {
            console.error("TFMedievalAutoRp: failed to parse embedded 'Autorp.txt' inside Autorp.ts", e);
        }
    },
    stop() {
        data = null;
        reverseMap = null;
        reversePhrases = [];
        prefixRegexes = [];
        suffixRegexes = [];
        forwardCategories = {};
    },

    onBeforeMessageSend(channelId, msg) {
        try {
            const pluginSettings = settings.store;
            if (!data || pluginSettings?.translationMode === "disabled") { return; }

            const translationMode = pluginSettings?.translationMode[0];
            if (typeof msg?.content === "string") {

                if (translationMode === "r") {
                    msg.content = reverseTransform(msg.content.trim());
                }
                else {
                    msg.content = transform(msg.content.trim());
                }
            }
        } catch (e) {
            console.error("TFMedievalAutoRp: onBeforeMessageSend failed", e);
        }
    }
});
