/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SmartPasteLanguage, SmartPasteLanguages } from "./settings";

export interface LanguageDetectionResult {
    language: SmartPasteLanguage | null;
    confidence: number;
}

type ScoreRule = readonly [RegExp, number];
type ScoreFn = (ctx: DetectorContext) => number;

interface DetectorContext {
    text: string;
    trimmed: string;
    lines: string[];
    firstLine: string;
    lastLine: string;
    lineCount: number;
    wordCount: number;
    sentenceCount: number;
    semicolonCount: number;
    colonCount: number;
    braceCount: number;
    bracketCount: number;
    parenCount: number;
    angleCount: number;
    tabLineCount: number;
    indentLineCount: number;
    codeSignalCount: number;
}

interface Detector {
    language: SmartPasteLanguage;
    score: ScoreFn;
}

const DETECTION_THRESHOLD = 12;
const MIN_MARGIN = 3;

function normalizeText(text: string) {
    return text.replace(/\r\n?/g, "\n");
}

function countMatches(text: string, regex: RegExp) {
    const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
    return text.match(new RegExp(regex.source, flags))?.length ?? 0;
}

function hasMatch(text: string, regex: RegExp) {
    return new RegExp(regex.source, regex.flags.replace(/g/g, "")).test(text);
}

function scoreRules(text: string, rules: ScoreRule[]) {
    let score = 0;
    for (const [regex, weight] of rules) {
        score += countMatches(text, regex) * weight;
    }
    return score;
}

function scoreLineStarts(lines: string[], rules: ScoreRule[]) {
    let score = 0;
    for (const line of lines) {
        for (const [regex, weight] of rules) {
            if (new RegExp(regex.source, regex.flags.replace(/g/g, "")).test(line)) {
                score += weight;
            }
        }
    }
    return score;
}

function createContext(text: string): DetectorContext {
    const normalized = normalizeText(text);
    const trimmed = normalized.trim();
    const lines = normalized.split("\n");
    const wordCount = (trimmed.match(/\b\w+\b/g) ?? []).length;
    const sentenceCount = (trimmed.match(/[.!?](?:\s|$)/g) ?? []).length;
    const semicolonCount = (trimmed.match(/;/g) ?? []).length;
    const colonCount = (trimmed.match(/:/g) ?? []).length;
    const braceCount = (trimmed.match(/[{}]/g) ?? []).length;
    const bracketCount = (trimmed.match(/\[/g) ?? []).length + (trimmed.match(/\]/g) ?? []).length;
    const parenCount = (trimmed.match(/[()]/g) ?? []).length;
    const angleCount = (trimmed.match(/[<>]/g) ?? []).length;
    const tabLineCount = lines.filter(line => /^\t+/.test(line)).length;
    const indentLineCount = lines.filter(line => /^ {2,}\S/.test(line)).length;
    const codeSignalCount = countMatches(trimmed, /\b(?:const|let|var|function|class|def|fn|package|import|export|interface|type|enum|return|if|else|for|while|switch|case|try|catch|finally|select|from|join|echo|println|printf|require|module\.exports|namespace|public|private|protected|readonly|struct|trait|impl|async|await)\b/g);

    return {
        text: normalized,
        trimmed,
        lines,
        firstLine: lines[0] ?? "",
        lastLine: lines[lines.length - 1] ?? "",
        lineCount: lines.length,
        wordCount,
        sentenceCount,
        semicolonCount,
        colonCount,
        braceCount,
        bracketCount,
        parenCount,
        angleCount,
        tabLineCount,
        indentLineCount,
        codeSignalCount,
    };
}

function isProbablyUrl(text: string) {
    const trimmed = text.trim();
    return /^https?:\/\//i.test(trimmed) && !/\s/.test(trimmed);
}

function isProbablyEmojiOnly(text: string) {
    const trimmed = text.trim();
    return trimmed.length > 0 && /^[\p{Extended_Pictographic}\s\p{P}\p{S}]+$/u.test(trimmed);
}

function isMarkdownLike(ctx: DetectorContext) {
    return /^#{1,6}\s+\S/m.test(ctx.text)
        || /^>\s+\S/m.test(ctx.text)
        || /^(?:- |\* |\d+\. )\S/m.test(ctx.text)
        || /^- \[[ xX]\]\s+/m.test(ctx.text)
        || /\[[^\]]+\]\([^)]+\)/.test(ctx.text)
        || /^\s*```/m.test(ctx.text)
        || /^\|.+\|$/m.test(ctx.text)
        || /`[^`]+`/.test(ctx.text);
}

function looksLikeProse(ctx: DetectorContext) {
    if (!ctx.trimmed) return false;
    if (isProbablyUrl(ctx.trimmed) || isProbablyEmojiOnly(ctx.trimmed)) return true;
    if (isMarkdownLike(ctx)) return false;

    const avgLineLength = ctx.trimmed.length / Math.max(1, ctx.lineCount);
    const sentenceLike = ctx.sentenceCount > 0 || /[.!?]$/.test(ctx.trimmed);
    const proseShape = ctx.codeSignalCount === 0
        && ctx.semicolonCount === 0
        && ctx.braceCount === 0
        && ctx.angleCount === 0
        && ctx.bracketCount === 0
        && ctx.tabLineCount === 0
        && ctx.indentLineCount === 0;

    if (ctx.lineCount === 1 && ctx.wordCount >= 5 && sentenceLike && proseShape) return true;
    if (ctx.lineCount <= 4 && ctx.wordCount >= 12 && avgLineLength >= 20 && sentenceLike && proseShape) return true;

    return false;
}

function scoreFromRules(ctx: DetectorContext, rules: ScoreRule[]) {
    return scoreRules(ctx.text, rules);
}

function scoreJson(ctx: DetectorContext) {
    try {
        JSON.parse(ctx.trimmed);
        return 100;
    } catch {
        // fall through to heuristics
    }

    let score = scoreFromRules(ctx, [
        [/^\s*(?:\{|\[)/m, 5],
        [/"[^"\n]+"\s*:/g, 4],
        [/\b(?:true|false|null)\b/g, 2],
        [/\b\d+(?:\.\d+)?\b/g, 1],
        [/\{[^{}]*\}/g, 2],
        [/\[[^\]]*\]/g, 2],
    ]);

    score -= scoreFromRules(ctx, [
        [/^\s*\/\//m, 4],
        [/^\s*#/m, 2],
    ]);

    return score;
}

function scoreYaml(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^---$/m, 10],
        [/^\.\.\.$/m, 6],
        [/^\s*-\s+\S+/gm, 4],
        [/^\s*[^\s:#][^:]*:\s*[^\n#].*$/gm, 4],
        [/^\s*[A-Za-z0-9_.-]+:\s*$/gm, 3],
        [/\b(?:true|false|null)\b/g, 1],
        [/\b(?:\||>|&[A-Za-z_][\w-]*|\*[A-Za-z_][\w-]*)\b/g, 2],
    ]);

    score += ctx.indentLineCount > 0 ? 2 : 0;
    score -= ctx.semicolonCount * 2;
    score -= ctx.braceCount;

    return score;
}

function scoreXml(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*<\?xml\b/i, 14],
        [/<!\[CDATA\[/g, 8],
        [/&(?:lt|gt|amp|apos|quot);/g, 3],
        [/<\/?[A-Za-z_][\w:.-]*(?:\s+[^<>]*?)?>/g, 4],
        [/xmlns(?::\w+)?=/g, 6],
        [/^\s*<\w[\w:-]*(?:\s+\w[\w:-]*=)/gm, 3],
    ]);

    score += /^\s*</.test(ctx.trimmed) && /<\/.+>/.test(ctx.text) ? 2 : 0;
    score -= /^\s*<!doctype html>/i.test(ctx.trimmed) ? 6 : 0;
    return score;
}

function scoreHtml(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/<!doctype html>/gi, 16],
        [/<html\b/i, 10],
        [/<head\b/i, 6],
        [/<body\b/i, 6],
        [/<\/\s*(?:html|head|body|div|span|script|style|section|article|main|button|input|a|p|ul|li|form|table)>/gi, 3],
        [/<(?:div|span|button|input|a|img|meta|link|script|style|section|article|main|nav|footer|header|form|table|tr|td|th|ul|li|svg|path)\b/gi, 4],
        [/\b(?:class|id|href|src|alt|title|role|aria-[\w-]+|data-[\w-]+)=/gi, 2],
        [/<!--|-->/g, 2],
    ]);

    score += countMatches(ctx.text, /<\w+[\s>]/g) >= 3 ? 2 : 0;
    score += countMatches(ctx.text, /\{[^{}]+\}/g) > 0 ? 1 : 0;
    score -= /^\s*<\?xml\b/i.test(ctx.trimmed) ? 8 : 0;

    return score;
}

function scoreCss(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*[.#][\w-]+\s*\{/gm, 5],
        [/^\s*@(?:media|supports|keyframes|import|font-face)\b/gm, 5],
        [/\b(?:color|background|display|margin|padding|font|width|height|position|flex|grid|border|content|transform|opacity|transition|animation|overflow|z-index|gap|align-items|justify-content)\s*:/gi, 2],
        [/::?[\w-]+/g, 1],
        [/!important/g, 3],
        [/url\(/g, 2],
    ]);

    score += ctx.braceCount > 0 ? 1 : 0;
    score -= ctx.semicolonCount === 0 ? 1 : 0;

    return score;
}

function scoreScss(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*\$[\w-]+\s*:/gm, 8],
        [/^\s*@(?:mixin|include|use|forward)\b/gm, 5],
        [/&[\w-]*/g, 3],
        [/\b(?:lighten|darken|mix|map-get|nth|rgba?|adjust-color|scale-color)\(/g, 2],
        [/^\s*[.#][\w-]+\s*\{/gm, 4],
    ]);

    score += countMatches(ctx.text, /\$[\w-]+/g) * 2;
    return score;
}

function scoreDockerfile(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*FROM\s+\S+/gim, 12],
        [/^\s*(?:RUN|COPY|WORKDIR|CMD|ENTRYPOINT|EXPOSE|ENV|ARG|USER|LABEL|VOLUME|ADD|SHELL)\b/gim, 4],
        [/^\s*COPY\s+--from=/gim, 7],
        [/^\s*FROM\s+\S+\s+AS\s+\S+/gim, 6],
        [/^\s*RUN\s+(?:apt|apk|yum|npm|pip|cargo|go|bundle)\b/gim, 4],
    ]);

    score += /^\s*#/.test(ctx.firstLine) ? 1 : 0;
    score -= ctx.wordCount > 20 && ctx.lineCount === 1 ? 4 : 0;
    return score;
}

function scoreToml(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*\[[^\]\n]+\]\s*$/gm, 8],
        [/^\s*\[\[[^\]\n]+\]\]\s*$/gm, 10],
        [/^\s*[A-Za-z0-9_.-]+\s*=\s*[^\n]+$/gm, 4],
        [/\b(?:true|false)\b/g, 1],
        [/\b\d{4}-\d{2}-\d{2}(?:[T ][^\s]+)?\b/g, 4],
        [/\{\s*[A-Za-z0-9_.-]+\s*=\s*[^}]+\}/g, 4],
    ]);

    score += countMatches(ctx.text, /^\s*\[[^\]]+\]$/gm) >= 2 ? 2 : 0;
    score -= ctx.colonCount > ctx.semicolonCount ? 2 : 0;
    return score;
}

function scoreIni(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*\[[^\]\n]+\]\s*$/gm, 6],
        [/^\s*[A-Za-z0-9_.-]+\s*=\s*[^\n]+$/gm, 4],
        [/^\s*[;#].*$/gm, 2],
        [/^\s*[A-Za-z0-9_.-]+\s*:\s*[^\n]+$/gm, 1],
    ]);

    score += ctx.semicolonCount > 0 ? 1 : 0;
    score -= /^\s*\[\[[^\]]+\]\]$/m.test(ctx.text) ? 4 : 0;
    score -= /\b\d{4}-\d{2}-\d{2}\b/.test(ctx.text) ? 2 : 0;
    return score;
}

function scoreRust(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*fn\s+main\s*\(/gm, 14],
        [/^\s*fn\s+\w+\s*\(/gm, 5],
        [/^\s*let\s+mut\b/gm, 8],
        [/^\s*pub\s+\w+/gm, 4],
        [/\bprintln!\s*\(/g, 6],
        [/\b(?:use\s+crate::|crate::|impl\b|match\b|Result<|Option<|Some\(|Ok\(|Err\(|unwrap\(|expect\(|trait\b|mod\b)\b/g, 3],
        [/^\s*#\[(?:derive|cfg|test|allow|warn|deny)\(/gm, 4],
        [/\b(?:Copy|Clone|Debug|Eq|PartialEq|Hash|Default)\b/g, 2],
    ]);

    score -= ctx.semicolonCount === 0 && ctx.braceCount > 0 ? 2 : 0;
    return score;
}

function scoreGo(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*package\s+main\b/gm, 12],
        [/^\s*package\s+\w+/gm, 6],
        [/^\s*func\s+main\s*\(/gm, 12],
        [/^\s*func\s+\w+\s*\(/gm, 5],
        [/^\s*import\s*\(/gm, 4],
        [/\bfmt\.(?:Print|Println|Printf)\b/g, 6],
        [/:=/g, 4],
        [/\b(?:defer|go\s+func|chan\b|range\b|make\(|struct\s*\{|error\b|map\[[^\]]+\])\b/g, 3],
        [/^\s*type\s+\w+\s+struct\s*\{/gm, 4],
    ]);

    score += ctx.braceCount > 0 ? 1 : 0;
    score -= ctx.semicolonCount > 0 ? 1 : 0;
    return score;
}

function scoreCSharp(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*using\s+System\b/gm, 10],
        [/^\s*namespace\s+\w+/gm, 6],
        [/^\s*public\s+static\s+void\s+Main\s*\(/gm, 10],
        [/\bConsole\.Write(Line)?\b/g, 5],
        [/\b(?:var|string|int|bool|Task|IEnumerable|List|Dictionary|Nullable)<[^>]+>/g, 4],
        [/\b(?:record\s+\w+|async\s+Task|using\s+static|string\[\]\s+args|=>|partial\s+class|await\s+|IReadOnlyList<)\b/g, 3],
        [/\b(?:public|private|protected|internal)\s+(?:static\s+)?(?:readonly\s+)?(?:class|struct|record|interface|enum|void|int|string|bool)\b/g, 2],
        [/^\s*#nullable\b/gm, 4],
    ]);

    score += countMatches(ctx.text, /\bget;\s*set;\b/g) * 2;
    score -= /^\s*using\s+namespace\b/m.test(ctx.text) ? 4 : 0;
    return score;
}

function scoreCpp(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/\bstd::\w+\b/g, 7],
        [/\b(?:cout|cin|cerr|clog|nullptr|template\s*<|typename\b|using\s+namespace\s+std|std::vector|std::string|std::map|std::unique_ptr|std::optional|std::variant|std::array|std::move|std::make_unique)\b/g, 4],
        [/^\s*#include\s+<(?:iostream|vector|string|map|algorithm|memory|utility|optional|variant|array|sstream)>/gm, 5],
        [/^\s*(?:public|private|protected):/gm, 3],
        [/^\s*(?:class|struct)\s+\w+\s*(?:[:][^{]+)?\{/gm, 3],
        [/\b(?:constexpr|decltype\(|friend\b|namespace\s+\w+|operator<<|operator>>|std::endl|std::string_view)\b/g, 2],
    ]);

    score += countMatches(ctx.text, /::/g) >= 2 ? 2 : 0;
    score -= /^\s*#include\s+<stdio\.h>/m.test(ctx.text) ? 6 : 0;
    return score;
}

function scoreC(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*#include\s+[<"][^>"]+[>"]\s*$/gm, 6],
        [/^\s*#(?:define|ifdef|ifndef|endif|if|elif|else|pragma)\b/gm, 5],
        [/\b(?:printf|scanf|malloc|free|sizeof|NULL|struct|typedef|fopen|fclose|fprintf|sprintf|strcpy|memcpy|atoi)\b/g, 3],
        [/\b(?:#include\s+<stdio\.h>|#include\s+<stdlib\.h>|#include\s+<string\.h>|#include\s+<ctype\.h>|#include\s+<stdint\.h>)\b/g, 6],
        [/\b(?:char\s*\*|int\s+main\s*\(|return\s+0;|->|sizeof\s*\(|enum\s+\w+|union\s+\w+|volatile\b)\b/g, 3],
    ]);

    score += countMatches(ctx.text, /#include\s+<stdio\.h>/g) > 0 ? 2 : 0;
    score -= /std::/.test(ctx.text) ? 5 : 0;
    return score;
}

function scoreJava(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*package\s+[\w.]+;?$/gm, 8],
        [/^\s*import\s+java\./gm, 6],
        [/^\s*public\s+class\s+\w+/gm, 7],
        [/^\s*public\s+static\s+void\s+main\s*\(/gm, 10],
        [/\bSystem\.out\.println\b/g, 5],
        [/\b(?:extends|implements|throws|new\s+ArrayList<|new\s+HashMap<|new\s+HashSet<|new\s+LinkedList<|@Override|synchronized|final\s+|static\s+void\s+main)\b/g, 3],
        [/^\s*@\w+/gm, 2],
        [/\b(?:List|Map|Set|Stream)<[^>]+>/g, 2],
    ]);

    score += ctx.lines.some(line => /;$/.test(line.trim())) ? 1 : 0;
    score -= /^\s*fun\s+\w+\s*\(/m.test(ctx.text) ? 5 : 0;
    return score;
}

function scoreKotlin(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*package\s+[\w.]+$/gm, 5],
        [/^\s*import\s+kotlin\./gm, 4],
        [/^\s*fun\s+main\s*\(/gm, 12],
        [/^\s*fun\s+\w+\s*\(/gm, 6],
        [/\b(?:val|var|data\s+class|object\s+\w+|companion\s+object|override|sealed\s+class|lateinit|when\s*\(|suspend\s+fun|mutableListOf|println\()\b/g, 4],
        [/\?\.|\?:|!!/g, 3],
        [/^\s*@\w+/gm, 2],
    ]);

    score += /\bfun\s+\w+\s*\(/.test(ctx.text) && /\bval\b|\bvar\b/.test(ctx.text) ? 2 : 0;
    score -= /^\s*public\s+class\s+/m.test(ctx.text) ? 3 : 0;
    return score;
}

function scoreSwift(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*import\s+(?:Foundation|SwiftUI|UIKit)\b/gm, 6],
        [/^\s*func\s+\w+\s*\(/gm, 7],
        [/^\s*(?:let|var)\s+\w+\s*:/gm, 4],
        [/^\s*(?:class|struct|enum|protocol|extension)\s+\w+/gm, 5],
        [/\b(?:guard\s+let|if\s+let|nil\b|Optional<|some\s+|any\s+|@IBOutlet|@State|@Published|print\()\b/g, 3],
        [/->|\?\s*:\s*|!\s*$/g, 2],
        [/\bself\b/g, 1],
    ]);

    score += /\bfunc\s+main\s*\(/.test(ctx.text) ? 4 : 0;
    score -= /^\s*fun\s+\w+\s*\(/m.test(ctx.text) ? 4 : 0;
    return score;
}

function scoreJsBase(ctx: DetectorContext) {
    return scoreFromRules(ctx, [
        [/\b(?:function|const|let|var|export|import|class|return|async|await|require\(|module\.exports|console\.log|Promise\.resolve|Promise\.all|setTimeout|document\.|window\.|Object\.keys|Object\.entries|Array\.isArray)\b/g, 3],
        [/=>/g, 4],
        [/^\s*(?:export\s+default|import\s+.*\s+from)\b/gm, 4],
    ]);
}

function scoreTypescript(ctx: DetectorContext) {
    let score = scoreJsBase(ctx);
    score += scoreFromRules(ctx, [
        [/\b(?:interface|type|enum|namespace|readonly|public|private|protected|declare|implements|abstract|as const|satisfies|infer)\b/g, 5],
        [/:\s*(?:string|number|boolean|unknown|never|any|void|Record<|Array<|Promise<|Set<|Map<|Readonly<|Partial<|Pick<|Omit<)/g, 4],
        [/\b(?:import\s+type|export\s+type|keyof|readonly\s+\w+|constructor\(|extends\s+\w+|implements\s+\w+)\b/g, 3],
        [/\b(?:React\.FC|PropsWithChildren|useState<|useRef<|useMemo<|useCallback<|JSX\.Element)\b/g, 3],
    ]);
    score -= /\brequire\(/.test(ctx.text) ? 4 : 0;
    return score;
}

function scoreJsx(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/<[A-Z][\w.:-]*(?:\s|>|\/)/g, 8],
        [/<[a-z][\w:-]*(?:\s[^>]*=|>|\/)/g, 3],
        [/\bclassName\s*=/g, 3],
        [/\bon[A-Z][A-Za-z]+\s*=/g, 3],
        [/\bchildren\b/g, 1],
        [/<>|<\/?>/g, 4],
    ]);

    score += /\{[^{}]+\}/.test(ctx.text) ? 2 : 0;
    score += /return\s*\(\s*</.test(ctx.text) ? 2 : 0;
    score -= /^\s*<html\b/i.test(ctx.trimmed) ? 6 : 0;
    return score;
}

function scoreTsx(ctx: DetectorContext) {
    return scoreJsx(ctx) + scoreTypescript(ctx) - scoreJsBase(ctx);
}

function scoreJavascript(ctx: DetectorContext) {
    let score = scoreJsBase(ctx);
    score += scoreFromRules(ctx, [
        [/\b(?:require\(|module\.exports|exports\.|console\.log|JSON\.parse\(|JSON\.stringify\(|fetch\(|Promise\.race\()\b/g, 4],
        [/\b(?:document\.|window\.|localStorage|sessionStorage)\b/g, 3],
    ]);
    score -= /\b(?:interface|type|enum|namespace|readonly|declare|implements|abstract|satisfies)\b/.test(ctx.text) ? 6 : 0;
    score -= /\brequire\(/.test(ctx.text) && /:\s*(?:string|number|boolean|unknown|never|any|void|Record<|Array<|Promise<)/.test(ctx.text) ? 3 : 0;
    return score;
}

function scorePython(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*(?:def|class|async def)\s+\w+\s*\(/gm, 6],
        [/^\s*(?:if|elif|else|for|while|try|except|with|match)\b.*:\s*$/gm, 4],
        [/\b(?:self|None|True|False|lambda|yield|nonlocal|global|pass|print\(|__init__|__name__|__main__|list\(|dict\(|set\()\b/g, 3],
        [/^\s*(?:from\s+\S+\s+import\s+|import\s+\S+)/gm, 4],
        [/\b(?:except\s+\w+\s+as\s+\w+|finally:|with\s+open\(|async\s+with|await\s+)\b/g, 3],
        [/^\s*@\w+/gm, 2],
    ]);

    score += ctx.lineCount > 1 && ctx.indentLineCount > 0 ? 2 : 0;
    score -= ctx.semicolonCount > 0 ? 4 : 0;
    score -= ctx.braceCount > 0 && ctx.codeSignalCount < 2 ? 2 : 0;
    return score;
}

function scorePhp(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*<\?php\b/m, 18],
        [/\$[A-Za-z_][\w]*/g, 4],
        [/^\s*(?:echo|print|function|namespace|use|class|trait|interface)\b/gm, 4],
        [/->|::|=>/g, 2],
        [/\b(?:require|require_once|include|include_once|array\s*\(|new\s+\w+\(|extends|implements)\b/g, 2],
    ]);

    score -= /^\s*<html\b/i.test(ctx.trimmed) ? 6 : 0;
    return score;
}

function scoreRuby(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [new RegExp("^\\s*#!/.*\\bruby\\b", "gm"), 10],
        [/^\s*def\s+\w+/gm, 7],
        [/^\s*class\s+\w+/gm, 5],
        [/^\s*module\s+\w+/gm, 4],
        [/^\s*require(_relative)?\b/gm, 4],
        [/\b(?:puts|p|attr_accessor|begin|rescue|ensure|yield|unless|elsif|then|end)\b/g, 3],
        [/:\w+/g, 1],
        [/@\w+/g, 1],
    ]);

    score += /\bdo\s*\|/.test(ctx.text) ? 3 : 0;
    score -= /^\s*function\b/m.test(ctx.text) ? 4 : 0;
    return score;
}

function scoreLua(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [new RegExp("^\\s*#!/.*\\blua\\b", "gm"), 10],
        [/^\s*local\s+\w+/gm, 6],
        [/^\s*function\s+\w+/gm, 5],
        [/^\s*end\b/gm, 4],
        [/^\s*repeat\b|^\s*until\b/gm, 3],
        [/\b(?:require|pairs|ipairs|print|nil|self|table\.|string\.|math\.)\b/g, 3],
        [/\.{3}/g, 1],
        [/--/g, 1],
    ]);

    score += /:\s*\w+\s*\(/.test(ctx.text) ? 1 : 0;
    score -= /^\s*def\s+/m.test(ctx.text) ? 4 : 0;
    return score;
}

function scoreBash(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [new RegExp("^\\s*#!/.*\\b(?:ba)?sh\\b", "gm"), 14],
        [/^\s*#!\/usr\/bin\/env\s+(?:sh|bash)\b/gm, 12],
        [/^\s*(?:if|then|elif|fi|for|while|case|esac|do|done|export|local|readonly|function)\b/gm, 4],
        [/\$\w+|\$\{[^}]+\}|\|\||&&|\$\(|`[^`]+`/g, 2],
        [/^\s*(?:echo|export|readonly|source|sudo|curl|wget|grep|awk|sed|chmod|chown|mkdir|rm|cp|mv|cat|printf)\b/gm, 3],
        [/\[\[.*\]\]|\b(?:test|trap|shift|getopts)\b|\b(?:-eq|-ne|-lt|-le|-gt|-ge)\b/g, 2],
        [/^\s*#.*$/gm, 1],
    ]);

    score += /\b(?:set -e|set -u|set -o|source\s+|\.\s+\S+\.sh)\b/.test(ctx.text) ? 2 : 0;
    score -= /^\s*<\w+/.test(ctx.trimmed) ? 4 : 0;
    return score;
}

function scorePowerShell(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^\s*param\s*\(/gim, 10],
        [/\$env:\w+/g, 5],
        [/^\s*(?:Get|Set|New|Remove|Start|Stop|Invoke|Where|ForEach|Select|Write|Add|Test)-[A-Za-z]+\b/gm, 5],
        [/\|\s*Where-Object\b|\|\s*ForEach-Object\b|\|\s*Select-Object\b/g, 4],
        [/@\{|\$null\b|\$PS\w+\b|\bWrite-Host\b|\bJoin-Path\b|\bGet-ChildItem\b|\bSet-Location\b|\b-ErrorAction\b|\b-Recurse\b/g, 3],
        [/\$_.+/g, 2],
    ]);

    score += /\bif\s*\([^)]*\)\s*\{/.test(ctx.text) ? 1 : 0;
    score -= /^\s*#!/m.test(ctx.text) ? 4 : 0;
    return score;
}

function scoreSql(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/\b(?:SELECT|FROM|WHERE|JOIN|INSERT\s+INTO|UPDATE|DELETE\s+FROM|GROUP\s+BY|ORDER\s+BY|LIMIT|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|TRUNCATE\s+TABLE|VALUES|HAVING|UNION|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CASE\s+WHEN|COUNT\(|DISTINCT|COALESCE|LIKE|BETWEEN)\b/gi, 3],
        [/^\s*(?:SELECT|INSERT|UPDATE|DELETE|WITH)\b/gm, 5],
        [/\b(?:VARCHAR|TEXT|INT|BIGINT|BOOLEAN|TIMESTAMP|DATE|DECIMAL|NUMERIC)\b/gi, 2],
        [/\b(?:PRIMARY\s+KEY|FOREIGN\s+KEY|NOT\s+NULL|AUTO_INCREMENT|SERIAL|IDENTITY)\b/gi, 3],
        [/\*/g, 1],
    ]);

    score += ctx.semicolonCount > 0 ? 1 : 0;
    score -= ctx.braceCount > 0 ? 2 : 0;
    return score;
}

function scoreMarkdown(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/^#{1,6}\s+\S+/gm, 5],
        [/^>\s+\S+/gm, 3],
        [/^(?:- |\* |\d+\. )\S+/gm, 3],
        [/^\|.+\|$/gm, 4],
        [/^```/gm, 10],
        [/\[[^\]]+\]\([^)]+\)/g, 3],
        [/`[^`]+`/g, 2],
        [/^- \[[ xX]\]\s+/gm, 4],
        [/^---+$/gm, 2],
    ]);

    score += /\b(?:bold|italic|heading|blockquote|code block)\b/i.test(ctx.text) ? 1 : 0;
    score -= ctx.codeSignalCount > 3 ? 2 : 0;
    return score;
}

function scoreLog(ctx: DetectorContext) {
    let score = scoreFromRules(ctx, [
        [/\b(?:TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL)\b/g, 4],
        [/^\s*(?:\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?|\[[A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\]|\w{3}\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}:\d{2}(?:\s+[AP]M)?)\b/gm, 6],
        [/^\s+at\s+\S+\(.*\)$/gm, 4],
        [/^\s*File ".+", line \d+/gm, 4],
        [/\b(?:Exception|Traceback|Caused by:|Stack trace|stderr|stdout|pid=|tid=|request_id=|thread=)\b/g, 3],
        [/\b\w+=\S+/g, 1],
    ]);

    score += ctx.lineCount > 1 && ctx.wordCount > 10 ? 1 : 0;
    score -= isMarkdownLike(ctx) ? 2 : 0;
    return score;
}

const DETECTORS: Detector[] = [
    // Exact formats first.
    { language: "json", score: scoreJson },
    { language: "yaml", score: scoreYaml },
    { language: "xml", score: scoreXml },
    { language: "html", score: scoreHtml },
    { language: "css", score: scoreCss },
    { language: "scss", score: scoreScss },
    { language: "markdown", score: scoreMarkdown },
    { language: "dockerfile", score: scoreDockerfile },
    { language: "toml", score: scoreToml },
    { language: "ini", score: scoreIni },
    // Compiled languages.
    { language: "rust", score: scoreRust },
    { language: "go", score: scoreGo },
    { language: "csharp", score: scoreCSharp },
    { language: "cpp", score: scoreCpp },
    { language: "c", score: scoreC },
    { language: "java", score: scoreJava },
    { language: "kotlin", score: scoreKotlin },
    { language: "swift", score: scoreSwift },
    // Scripting languages.
    { language: "tsx", score: scoreTsx },
    { language: "jsx", score: scoreJsx },
    { language: "typescript", score: scoreTypescript },
    { language: "javascript", score: scoreJavascript },
    { language: "python", score: scorePython },
    { language: "php", score: scorePhp },
    { language: "ruby", score: scoreRuby },
    { language: "lua", score: scoreLua },
    { language: "bash", score: scoreBash },
    { language: "powershell", score: scorePowerShell },
    { language: "sql", score: scoreSql },
    { language: "log", score: scoreLog },
];

function detectScores(ctx: DetectorContext) {
    const entries = DETECTORS.map((detector, index) => ({
        language: detector.language,
        score: detector.score(ctx),
        order: index,
    }));

    entries.sort((left, right) => right.score - left.score || left.order - right.order);
    return entries;
}

export function detectSmartPasteLanguage(text: string): LanguageDetectionResult {
    const ctx = createContext(text);

    if (!ctx.trimmed || /^\s*```/.test(ctx.trimmed)) {
        return { language: null, confidence: 0 };
    }

    if (looksLikeProse(ctx)) {
        return { language: null, confidence: 0 };
    }

    const ranked = detectScores(ctx);
    const best = ranked[0];
    const second = ranked[1];
    const confidence = best?.score ?? 0;

    if (!best || confidence < DETECTION_THRESHOLD) {
        return { language: null, confidence };
    }

    if (second && confidence - second.score < MIN_MARGIN) {
        return { language: null, confidence };
    }

    return {
        language: best.language,
        confidence,
    };
}

export function canSmartPaste(text: string, minimumLines: number, minimumCharacters: number, ignoreSingleLineSnippets: boolean) {
    const ctx = createContext(text);
    if (!ctx.trimmed || /^\s*```/.test(ctx.trimmed)) return false;
    if (isProbablyUrl(ctx.trimmed) || isProbablyEmojiOnly(ctx.trimmed)) return false;
    if (looksLikeProse(ctx)) return false;

    if (ignoreSingleLineSnippets && ctx.lineCount <= 1) return false;
    if (ctx.lineCount < minimumLines && ctx.trimmed.length < minimumCharacters) return false;

    return true;
}

export function wrapSmartPaste(text: string, language: SmartPasteLanguage) {
    const normalized = normalizeText(text);
    const maxFenceRun = normalized.match(/`+/g)?.reduce((max, run) => Math.max(max, run.length), 0) ?? 0;
    const fence = "`".repeat(Math.max(3, maxFenceRun + 1));
    const tag = language === "plaintext" ? "" : language;

    return `${fence}${tag}\n${normalized}\n${fence}`;
}

export const supportedSmartPasteLanguages = SmartPasteLanguages;
