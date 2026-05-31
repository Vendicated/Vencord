/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Local PT-BR corrections — the free LanguageTool API misses a lot of
 * common accent and punctuation stuff, so we catch it here.
 */

// Words Brazilians frequently type without accents.
// Only includes unambiguous cases where the unaccented form
// isn't a valid word in the same context.
const ACCENT_MAP: Record<string, string> = {
    "ola": "olá",
    "voce": "você",
    "você̂": "você",            // mixed encoding, thanks discord
    "vc": "você",
    "nao": "não",
    "ja": "já",
    "ate": "até",
    "so": "só",                 // "so" isn't a word in pt-br
    "esta": "está",
    "estas": "estás",
    "tem": "têm",
    "vem": "vêm",
    "estao": "estão",
    "comeca": "começa",
    "comecam": "começam",
    "poe": "põe",
    "poem": "põem",
    "e": "é",                   // only replaces in verb context (see below)
    "ingles": "inglês",
    "portugues": "português",
    "frances": "francês",
    "japones": "japonês",
    "chines": "chinês",
    "alemao": "alemão",
    "coracao": "coração",
    "cancao": "canção",
    "licao": "lição",
    "sabado": "sábado",
    "varias": "várias",
    "varios": "vários",
    "tambem": "também",
    "tb": "também",
    "tbm": "também",
    "atraves": "atrás",
    "sotaque": "sotaque",
    // internet abbreviations
    "obg": "obrigado",
    "obrigada": "obrigada",
    "blz": "beleza",
    "msm": "mesmo",
    "dps": "depois",
    "cmg": "comigo",
    "ctg": "contigo",
    "pq": "porque",             // could be "porquê" but 90% of the time it's porque
    "q": "que",
    "eh": "é",
    "entao": "então",
    "porem": "porém",
    "ta": "tá",
};

// Context check for verbs — some words (esta, tem, e) have valid
// accented and unaccented forms so we only replace in verb context.
const VERB_PRECEDERS = new Set([
    "eu", "tu", "ele", "ela", "voce", "você", "vc", "nos", "nós", "vós",
    "eles", "elas", "voces", "vocês", "a", "o", "se", "nao", "não",
    "ja", "já", "sempre", "nunca", "ainda", "também", "tambem",
    "agora", "depois", "hoje", "ontem", "amanhã", "amanha",
    // demonstratives can precede verbs too: "isso é", "isto está"
    "isso", "isto", "aquilo", "este", "esta", "estes", "estas",
    "esse", "essa", "esses", "essas", "aquele", "aquela", "aqueles", "aquelas",
]);

// Disambiguates "e" (conjunction AND vs verb IS).
// When "e" is followed by a pronoun, it's almost certainly "and".
const PRONOUNS = new Set([
    "eu", "tu", "ele", "ela", "você", "voce", "vc", "nós", "nos", "vós",
    "eles", "elas", "vocês", "voces",
    "mim", "comigo", "cmg", "te", "ti", "contigo", "ctg",
    "lhe", "lhes", "se", "si", "consigo",
    "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
    "aquele", "aquela", "aqueles", "aquelas", "isso", "isto", "aquilo",
]);

// ─── COMMA RULES ───

function applyCommaRules(text: string): string {
    let result = text;

    // 1. Comma after greeting/affirmation at sentence start
    // "Oi tudo bem" → "Oi, tudo bem"
    // Longer phrases must come before shorter ones in the alternation
    const startMatch = result.match(
        /^(Nossa\s+Senhora|Meu\s+Deus|Oi|Olá|Ola|Sim|Claro|Lógico|Logico|Obviamente|Infelizmente|Nossa|Putz|Caramba|Bah|Vixe|Poxa|Ah|Oh|Parabéns|Parabens)(\s+)([A-Za-z])/i
    );
    if (startMatch && !result.includes(",")) {
        result = result.replace(
            /^(Nossa\s+Senhora|Meu\s+Deus|Oi|Olá|Ola|Sim|Claro|Lógico|Logico|Obviamente|Infelizmente|Nossa|Putz|Caramba|Bah|Vixe|Poxa|Ah|Oh|Parabéns|Parabens)(\s+)([A-Za-z])/i,
            (_, w, s, n) => w + "," + s + n
        );
    }

    // 2. Comma before conjunctions (mas, porém, etc) mid-sentence
    // TODO: still breaks on some edge cases but works for casual use
    result = result.replace(
        /(\S)\s+(mas|por[eéê]m|contudo|todavia|entretanto|portanto|ent[aã]o|entao)\b/gi,
        (match, prevChar, conj) => {
            if (/[a-zA-Záéíóúãõâêîôûàüç]/i.test(prevChar)) {
                return prevChar + ", " + conj.toLowerCase();
            }
            return match;
        }
    );

    return result;
}

// ─── SENTENCE SPLITTING ───
// Tries to split text into logical sentences before applying ending punctuation.
// This way "ola tudo bem como voce esta" becomes
// "Olá, tudo bem? Como você está?" instead of one flat sentence with a period.

// Short phrases Brazilians use to separate ideas.
// Non-capturing groups are critical — JS split() leaks captured groups
// into the result array if we use capturing groups.
const SENTENCE_BREAKERS = /(?<=\b(?:tudo bem|tudo bom|beleza|blz|que isso|e a[ií]|e ai|então|entao|e você|e tu|ok|certo|n[ée]|que tal)\b)\s+(?=[A-Za-záéíóúãõâêîôûàüç])/i;

// Words that typically start a new sentence
const NEW_SENTENCE_STARTERS = /^(como|que|qual|quais|quem|quando|onde|o que|por que|porque|quanto|quantos|quantas|será|sera|talvez|também|tambem|mas|porém|porem|contudo|todavia|entretanto|portanto|e você|e tu|e ela|e ele|e nós|e nos|e vocês|e voces|vamos|quer|querem|pode|podem|depois|aí|ai|então|entao|agora|hoje|ontem|amanhã|amanha)/i;

function splitSentences(text: string): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [text];

    // Already has punctuation — split on it
    const byPunct = trimmed.split(/(?<=[.!?…])\s+/);
    if (byPunct.length > 1) return byPunct;

    // Split on known breakers (tudo bem, ok, etc.)
    const byBreaker = trimmed.split(SENTENCE_BREAKERS);
    if (byBreaker.length > 1) return byBreaker;

    // Give up, treat as single sentence
    return [trimmed];
}

// ─── SENTENCE CLASSIFICATION ───

function classifySentence(text: string): "statement" | "question" | "exclamation" {
    const trimmed = text.trim();
    if (!trimmed) return "statement";
    const lower = trimmed.toLowerCase();

    // Tag questions at end: "né", "certo", "sabe"
    if (/,\s*(n[ée]|certo|ok|t[aá] bem|sabe|viu|entendeu|percebeu|n[aã]o acha|n[aã]o vai|n[aã]o é|pode crer)\s*$/i.test(trimmed)) {
        return "question";
    }

    // Greeting + "tudo bem" = classic br question pattern
    if (/^(ol[aá]|oi)\b.*\b(tudo bem|tudo bom|beleza)\b/i.test(trimmed)) {
        return "question";
    }

    // Question words at start
    if (/^(que\b|qual\b|quais\b|quem\b|quando\b|onde\b|como\b|por\s+que\b|porque\b|quanto\b|quantos?\b|ser[áa]\s+que|que\s+tal)\s/i.test(trimmed)) {
        return "question";
    }

    // Standalone short question phrases
    if (/^(tudo bem|tudo bom|beleza|blz|que isso|quanto|quem|que horas|que dia|e a[ií]|e tal|e ent[aã]o|como assim|pode ser|vamos|bora|certo|ok|diretos?)$/i.test(lower)) {
        return "question";
    }

    // Common pt-br question starters
    if (/^(tudo bem|tudo bom|beleza|que tal|ser[áa]|vamos|quer|querem|pode|podem|bora|vai|v[aã]o)\s/i.test(trimmed)) {
        return "question";
    }

    // "você/tu + verb" in specific contexts
    // Keeping conservative to avoid false positive flood
    if (/^(voc[êe]|tu)\s+(est[áa]|t[áa]|sabe|quer|pode)\s+(bem|mal|certo|ok|a[ií]|agora|hoje|la[lá]|j[áa])$/i.test(trimmed)) {
        return "question";
    }
    if (/^(voc[êe]|tu)\s+(sabe|quer|pode|vai|vem|viu|entendeu|percebeu|ouviu|concorda)$/i.test(trimmed)) {
        return "question";
    }

    // "você já + verb" is almost always a question in br chat
    // e.g. "você já comeu?", "tu já viu?"
    if (/^(voc[êe]|tu)\s+(j[áa])\s+/i.test(trimmed) && !/[.!?…]$/.test(trimmed)) {
        const words = trimmed.split(/\s+/).length;
        if (words <= 5) return "question";
    }

    // Interjection at start = exclamation
    if (/^(nossa|putz|caramba|bah|vixe|poxa|ai|ui|oh|ah|nossa senhora|meu deus|valha|caraca|minha nossa|nossa nossa|puxa|eita|opa|ih|hmm|hum|affs?|puts|putss|credo|que horror|que nojo)[,\s]/i.test(trimmed) && !/[.!?…]$/.test(trimmed)) {
        return "exclamation";
    }

    // "que + adjective" (que bonito, que legal) — but not "que horas" etc
    if (/^(que)\s+(?!tal\b|horas\b|dia\b|noite\b|hora\b|anos?\b|meses?\b|isso\b|aquilo\b|você\b|tu\b|ele\b|ela\b|nós\b|vocês\b)\w+/i.test(trimmed)) {
        return "exclamation";
    }

    // Standalone interjections
    if (/^(ol[aá]|oi|parab[ée]ns|obrigado|obrigada|valeu|show|incr[íi]vel|demais|fant[áa]stico|maravilhoso|perfeito|[óo]timo|[óo]tima|horr[íi]vel|lindo|linda|amei|divino|divina|bacaninha|top|massa|legal|legalz[aã]o|foi mal|desculpa|desculpe|sinto muito)$/i.test(lower)) {
        return "exclamation";
    }

    // Exclamation words at sentence start
    // Note: [,\s] covers the comma applyCommaRules might have added
    if (/^(parab[ée]ns|obrigado|obrigada|valeu|show|incr[íi]vel|demais|fant[áa]stico|maravilhoso|perfeito|[óo]timo|[óo]tima|horr[íi]vel|lindo|linda|amei)[,\s]/i.test(trimmed)) {
        return "exclamation";
    }

    // "que" mid-sentence starting a clause with a strong adjective
    if (/,\s*(que)\s+(bonito|lindo|legal|chato|chata|estranho|dif[íi]cil|f[áa]cil|ruim|bom|boa|caro|barato|frio|quente)\b/i.test(trimmed)) {
        return "exclamation";
    }

    // "muito + positive adjective" (short phrase)
    if (/muito\s+(bom|boa|legal|lindo|linda|feliz|triste|ruim|bonito|bonita|caro|barato|f[ée]io|f[ée]ia|grande|pequeno|show|bacana|top|massa)\b/i.test(trimmed)) {
        return "exclamation";
    }

    // Short intense phrases
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount <= 4 && /(bom demais|legal demais|lindo demais|top demais|muito bom|muito legal|muito lindo|massa demais|show demais|amei demais|muito obrigado|que nada|nada disso|claro que sim|claro que n[aã]o|l[óo]gico|[ée] claro|pode crer|bora|vamo nessa)/i.test(trimmed)) {
        return "exclamation";
    }

    return "statement";
}

function answerPunctuation(text: string): string {
    const trimmed = text.trim().replace(/[.!?…\s]+$/, "");
    if (!trimmed) return text;

    const type = classifySentence(trimmed);
    switch (type) {
        case "question": return trimmed + "?";
        case "exclamation": return trimmed + "!";
        default: return trimmed + ".";
    }
}

const SENTENCE_END = /[.!?…]+$/;

function ensureSentenceEnding(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return text;

    const sentences = splitSentences(trimmed);
    const processed = sentences.map(s => {
        const st = s.trim();
        if (!st) return s;
        if (SENTENCE_END.test(st)) return st;
        return answerPunctuation(st);
    });

    return processed.join(" ");
}

// If LanguageTool capitalised the first word but left the accent off, fix it
const FIRST_WORD_FIXES: Record<string, string> = {
    "Ola": "Olá",
    "Olá́": "Olá",     // cursed encoding
    "Ate": "Até",
    "Até́": "Até",
    "So": "Só",
    "Ja": "Já",
    "Nao": "Não",
    "Voce": "Você",
    "Você̂": "Você",   // encoding strikes again
    "Tambem": "Também",
};

const WORD_CHARS = /[a-z0-9áéíóúãõâêîôûàüç]/i;

function stripPunct(s: string): string {
    let start = 0;
    while (start < s.length && !WORD_CHARS.test(s[start])) start++;
    let end = s.length;
    while (end > start && !WORD_CHARS.test(s[end - 1])) end--;
    return s.slice(start, end);
}

// ─── MAIN ENTRY ───

export function applyLocalCorrections(text: string): string {
    if (!text || text.length < 2) return text;

    let result = text;

    // "eai" → "e aí" so the ACCENT_MAP handles each part independently
    result = result.replace(/\beai\b/gi, "e aí");

    // Fix first word accent (LT capitalises but misses accents)
    const firstSpace = result.indexOf(" ");
    const firstWord = firstSpace === -1 ? result : result.slice(0, firstSpace);
    const fixedFirst = FIRST_WORD_FIXES[firstWord];
    if (fixedFirst) {
        result = fixedFirst + (firstSpace === -1 ? "" : result.slice(firstSpace));
    }

    // Walk through words applying ACCENT_MAP
    // Split on whitespace to preserve original spacing
    const tokens = result.split(/(\s+)/);
    const contentWords: string[] = [];

    for (const t of tokens) {
        if (/^\s*$/.test(t)) continue;
        contentWords.push(stripPunct(t).toLowerCase());
    }

    let wordIdx = 0;
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (/^\s*$/.test(t)) continue;

        const clean = stripPunct(t).toLowerCase();
        if (!clean) { wordIdx++; continue; }

        const lowerT = t.toLowerCase();
        const cleanStart = lowerT.indexOf(clean);
        const prefix = cleanStart > 0 ? t.slice(0, cleanStart) : "";
        const suffixLen = t.length - (prefix.length + clean.length);
        const suffix = suffixLen > 0 ? t.slice(t.length - suffixLen) : "";

        if (ACCENT_MAP[clean]) {
            const replacement = ACCENT_MAP[clean];
            // Ambiguous words: only replace in verb context
            if (["esta", "estas", "tem", "vem", "e"].includes(clean)) {
                const prevWord = wordIdx > 0 ? contentWords[wordIdx - 1] : null;
                if (!(wordIdx === 0 || (prevWord != null && VERB_PRECEDERS.has(prevWord)))) {
                    wordIdx++;
                    continue;
                }
                // "e" before a pronoun = conjunction (e.g. "eu e você")
                if (clean === "e") {
                    const nextWord = wordIdx < contentWords.length - 1 ? contentWords[wordIdx + 1] : null;
                    if (nextWord && (PRONOUNS.has(nextWord) || nextWord === "ai" || nextWord === "aí")) {
                        wordIdx++;
                        continue;
                    }
                }
            }
            // Preserve original capitalisation
            const firstChar = t[prefix.length] || "";
            const isCapitalised = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
            tokens[i] = prefix + (isCapitalised
                ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
                : replacement) + suffix;
            wordIdx++;
            continue;
        }

        // "eh" → "é" (verb context only)
        if (clean === "eh" || clean === "eh́") {
            const prevWord = wordIdx > 0 ? contentWords[wordIdx - 1] : null;
            if (wordIdx === 0 || (prevWord != null && VERB_PRECEDERS.has(prevWord))) {
                tokens[i] = prefix + "é" + suffix;
            }
        }

        wordIdx++;
    }

    result = tokens.join("");

    // Apply comma rules
    result = applyCommaRules(result);

    // Apply sentence-ending punctuation
    result = ensureSentenceEnding(result);

    // Capitalise first letter and after sentence breaks
    if (result.length > 0) {
        const first = result.charAt(0);
        const upper = first.toLocaleUpperCase("pt-BR");
        if (first !== upper) {
            result = upper + result.slice(1);
        }
        result = result.replace(
            /([.!?])\s+(.)/g,
            (_, punct, char) => punct + " " + char.toLocaleUpperCase("pt-BR")
        );
    }

    return result;
}
