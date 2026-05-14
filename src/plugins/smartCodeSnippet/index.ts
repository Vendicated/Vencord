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

import definePlugin, { PluginTag } from "@utils/types";
import { MessageActions } from "@webpack/common";

const CHUNK_LIMIT = 1900;
const CB = "```";

const DICTIONARY = [
    { lang: "tsx", weight: 15, regex: /\b(useState|useEffect|useContext|useMemo|useCallback|useRef|useReducer|import\s+React|export\s+default\s+function|getStaticProps|getServerSideProps|<\w+[^>]*>.*<\/\w+>|<[A-Z][a-zA-Z0-9]*\s*\/>)\b/g },
    { lang: "vue", weight: 14, regex: /\b(<template>|<script\s+setup>|defineProps|defineEmits|ref\(|computed\(|v-if|v-for|v-model|@click|:\w+=)\b/g },
    { lang: "docker", weight: 15, regex: /^(FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|HEALTHCHECK|ONBUILD|SHELL|ARG)\b/gm },
    { lang: "css", weight: 15, regex: /([.#][a-z0-9_-]+[:\w-]*\s*\{|@(?:import|media|keyframes|font-face|layer)|(?:content|display|margin|padding|color|background|flex|grid|position|overflow|z-index|opacity|border|outline|text|font|transform|transition|animation|box-shadow):\s*[^;]+;|:(?:before|after|hover|active|focus|root|nth-child|not|empty|valid|invalid))/gi },
    { lang: "html", weight: 14, regex: /(<!DOCTYPE|(?:\s|\n)<(?:html|head|body|div|span|meta|link|script|section|article|nav|header|footer|aside|main|button|input|label|form|table|tr|td|h[1-6]|p|ul|ol|li|img|iframe|canvas|svg|path|circle|rect)[^>]*>|<\/(?:html|body|div|span|script|section|article|nav|header|footer|aside|main|button|input|label|form|table|tr|td|h[1-6]|p|ul|ol|li|svg|path)>|class=["']|id=["']|data-[\w-]+=|href=|src=)/gi },
    { lang: "rust", weight: 14, regex: /\b(fn\s+main|println!|let\s+mut|pub\s+fn|impl\s+|match\s+|Option<|Result<|Vec::new|unwrap\(\)|expect\(|cargo\.toml|derive|unsafe\s*\{)\b/g },
    { lang: "cs", weight: 13, regex: /\b(using\s+System|namespace\s+\w+|public\s+class|Console\.Write|Task<|\[SerializeField\]|MonoBehaviour|GetComponent<|await\s+Task|lock\s*\()/g },
    { lang: "ps", weight: 13, regex: /\b(irm|iex|Invoke-WebRequest|Write-Host|Get-Command|-ErrorAction|Set-ExecutionPolicy|\$args|Get-Service|Stop-Process|New-Item|Test-Path)\b/gi },
    { lang: "sh", weight: 12, regex: /\b(sudo\s|apt-get|npm\s+|pnpm\s|yarn\s|pip\s+|echo\s+|chmod|chown|grep|mkdir|rm\s+-rf|export\s+\w+=|source\s+[\w./]+|case\s+.*\s+in)\b/g },
    { lang: "sql", weight: 12, regex: /\b(SELECT\s+.*\s+FROM|INSERT\s+INTO|UPDATE\s+.*\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+DATABASE|JOIN|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|CONSTRAINT)\b/gi },
    { lang: "yaml", weight: 10, regex: /^[a-zA-Z0-9_-]+\s*:\s*(?:$|\n|\[|\w|'|")/gm },
    { lang: "json", weight: 10, regex: /^\s*\{\s*"[\w-]+"\s*:\s*["\w\{\[]/gm }
];

export default definePlugin({
    name: "smartCodeSnippet",
    description: "Automated code detection and splitting using the standard Vencord API.",
    authors: [{ name: "s4huan", id: 1497485763133177947n }],
    tags: [PluginTag.Chat, PluginTag.Utility],
    requiresRestart: false,

    async onBeforeMessageSend(channelId, message) {
        const originalContent = message.content.trim();
        if (originalContent.startsWith(CB) && originalContent.endsWith(CB)) return;

        let bestMatch = { lang: "", score: 0 };
        for (const item of DICTIONARY) {
            const matches = originalContent.match(item.regex);
            const score = matches ? matches.length * item.weight : 0;
            if (score > bestMatch.score) {
                bestMatch = { lang: item.lang, score };
            }
        }

        const codeSymbols = /([{}\[\]=><;]|\(\)|=>|===|!==|\|\||&&|<\/|\?>|\||::)/;
        const isMultiLine = originalContent.includes("\n");
        const hasSymbols = codeSymbols.test(originalContent);
        let isCode = false;

        if (["html", "css", "docker", "ps", "sh", "json", "yaml"].includes(bestMatch.lang) && bestMatch.score >= 11) {
            isCode = true;
        } else if (bestMatch.score >= 18) {
            isCode = true;
        } else if (isMultiLine && hasSymbols && bestMatch.score >= 5) {
            isCode = true;
        }

        if (isCode) {
            const lang = bestMatch.lang;
            if (originalContent.length > CHUNK_LIMIT) {
                const chunks: string[] = [];
                const lines = originalContent.split("\n");
                let currentChunk = "";

                for (const line of lines) {
                    if ((currentChunk.length + line.length + 1) > CHUNK_LIMIT) {
                        chunks.push(currentChunk);
                        currentChunk = line;
                    } else {
                        currentChunk += (currentChunk ? "\n" : "") + line;
                    }
                }
                if (currentChunk) chunks.push(currentChunk);

                message.content = `${CB}${lang}\n${chunks[0]}\n${CB}`;

                for (let i = 1; i < chunks.length; i++) {
                    MessageActions.sendMessage(channelId, {
                        content: `${CB}${lang}\n${chunks[i]}\n${CB}`,
                        invalidEmojis: [],
                        validNonShortcutEmojis: [],
                        tts: false
                    });
                }
            } else {
                message.content = `${CB}${lang}\n${originalContent}\n${CB}`;
            }
        }
    }
});
