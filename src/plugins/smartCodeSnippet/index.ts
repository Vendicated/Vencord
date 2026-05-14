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

import definePlugin from "@utils/types";
import { findByProps } from "@webpack";

let messageModule: any;
let origSendMessage: any;

const MAX_LENGTH = 1980; 

const DICTIONARY = [
    { lang: "css", weight: 15, keywords: /([.#][a-z0-9_-]+[:\w-]*\s*\{|@(?:import|media|keyframes|font-face|layer)|(?:content|display|margin|padding|color|background|flex|grid|position|overflow|z-index|opacity|border|outline|text|font|transform|transition|animation|box-shadow):\s*[^;]+;|:(?:before|after|hover|active|focus|root|nth-child|not|empty|valid|invalid))\b/i },
    { lang: "html", weight: 14, keywords: /(<!DOCTYPE|(?:\s|\n)<(?:html|head|body|div|span|meta|link|script|section|article|nav|header|footer|aside|main|button|input|label|form|table|tr|td|h[1-6]|p|ul|ol|li|img|iframe|canvas|svg|path|circle|rect)[^>]*>|<\/(?:html|body|div|span|script|section|article|nav|header|footer|aside|main|button|input|label|form|table|tr|td|h[1-6]|p|ul|ol|li|svg|path)>|class=["']|id=["']|data-[\w-]+=|href=|src=)/i },
    { lang: "tsx", weight: 15, keywords: /\b(import\s+React|useState|useEffect|useContext|useMemo|useCallback|useRef|useReducer|jsx|tsx|export\s+default\s+function|getStaticProps|getServerSideProps|<\w+[^>]*>.*<\/\w+>|<[A-Z][a-zA-Z0-9]*\s*\/>)\b/ },
    { lang: "asm", weight: 13, keywords: /\b(mov|push|pop|rax|eax|rbx|ebx|rcx|ecx|rdx|edx|rsi|edi|jmp|call|ret|section\s+\.text|global\s+_start|db|dw|dd|syscall)\b/i },
    { lang: "cpp", weight: 13, keywords: /(#include\s*<|std::|int\s+main\(|cout\s*<<|cin\s*>>|nullptr|dynamic_cast<|using\s+namespace|template\s*<|__stdcall|__fastcall)/ },
    { lang: "rust", weight: 14, keywords: /\b(fn\s+main|println!|let\s+mut|pub\s+fn|impl\s+|match\s+|Option<|Result<|Vec::new|unwrap\(\)|expect\(|cargo\.toml|derive|unsafe\s*\{)\b/ },
    { lang: "zig", weight: 14, keywords: /\b(const\s+std\s*=\s*@import|pub\s+fn\s+main|try\s+stdout\.print|catch\s|defer\s|comptime)\b/ },
    { lang: "ada", weight: 14, keywords: /\b(with\s+Ada|procedure\s+\w+\s+is|begin|end\s+\w+;|package\s+body|type\s+\w+\s+is|loop|new\s+\w+)\b/i },
    { lang: "cobol", weight: 14, keywords: /\b(IDENTIFICATION\s+DIVISION|ENVIRONMENT\s+DIVISION|DATA\s+DIVISION|PROCEDURE\s+DIVISION|WORKING-STORAGE\s+SECTION|PIC\s+X|DISPLAY|STOP\s+RUN)\b/i },
    { lang: "fortran", weight: 13, keywords: /\b(PROGRAM\s+\w+|END\s+PROGRAM|PRINT\s*\*,|INTEGER|REAL|DIMENSION|SUBROUTINE|ALLOCATE|DEALLOCATE|COMPLEX)\b/i },
    { lang: "lisp", weight: 13, keywords: /\b(defun|defparameter|let|cond|car|cdr|nil|t|quote|setq|format\s+t|lambda|mapcar)\b/ },
    { lang: "pascal", weight: 12, keywords: /\b(program\s+\w+;|begin|end\.|writeln\(|procedure|function|var\s+\w+\s*:\s*\w+|integer|boolean|real|string|type)\b/i },
    { lang: "cs", weight: 13, keywords: /\b(using\s+System|namespace\s+\w+|public\s+class|Console\.Write|Task<|\[SerializeField\]|MonoBehaviour|GetComponent<|await\s+Task|lock\s*\()/ },
    { lang: "java", weight: 12, keywords: /\b(public\s+static\s+void\s+main|System\.out\.print|import\s+java\.|@Override|@Autowired|@RestController|public\s+interface|implements|extends)\b/ },
    { lang: "go", weight: 13, keywords: /\b(package\s+main|import\s+["']\w+["']|func\s+\w+\(|fmt\.Print|chan\s|go\s+func|select\s*\{|if\s+err\s*!=|type\s+\w+\s+struct)\b/ },
    { lang: "py", weight: 11, keywords: /\b(def\s+\w+\(|import\s+|from\s+[\w.]+\s+import|if\s+__name__\s*==\s*"__main__":|print\(|lambda\s+|@\w+|self\.|__init__|np\.|pd\.|tf\.|torch\.)\b/ },
    { lang: "php", weight: 11, keywords: /(<\?php|\b(var_dump\(|echo\s+"|namespace\s+[A-Za-z]|public\s+function\s+|require_once|foreach\s*\(.*as)|artisan|Route::get)\b/ },
    { lang: "docker", weight: 15, keywords: /^(FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|HEALTHCHECK|ONBUILD|SHELL|ARG)\b/m },
    { lang: "sql", weight: 12, keywords: /\b(SELECT\s+.*\s+FROM|INSERT\s+INTO|UPDATE\s+.*\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+DATABASE|JOIN|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|CONSTRAINT)\b/i },
    { lang: "ps", weight: 13, keywords: /\b(irm|iex|Invoke-WebRequest|Write-Host|Get-Command|-ErrorAction|Set-ExecutionPolicy|\$args|Get-Service|Stop-Process|New-Item|Test-Path)\b/i },
    { lang: "sh", weight: 12, keywords: /\b(sudo\s|apt-get|npm\s+|pnpm\s|yarn\s|pip\s+|echo\s+|chmod|chown|grep|mkdir|rm\s+-rf|export\s+\w+=|source\s+[\w./]+|case\s+.*\s+in)\b/ },
    { lang: "yaml", weight: 10, keywords: /^[a-zA-Z0-9_-]+\s*:\s*(?:$|\n|\[|\w|'|")/m },
    { lang: "json", weight: 10, keywords: /^\s*\{\s*"[\w-]+"\s*:\s*["\w\{\[]/m },
    { lang: "dart", weight: 13, keywords: /\b(Widget|BuildContext|StatefulWidget|StatelessWidget|@override|pubspec\.yaml|void\s+main\(\)\s*\{|final\s+[A-Z]\w+|async\s+async\*)\b/ },
    { lang: "lua", weight: 11, keywords: /\b(local\s+function|print\(|end\s*\)|local\s+\w+\s*=|task\.wait|Instance\.new|require\s*\(|then\b)\b/ },
    { lang: "arduino", weight: 12, keywords: /\b(void\s+setup\(\)|void\s+loop\(\)|digitalWrite|digitalRead|pinMode|analogRead|Serial\.begin|Serial\.print)\b/ },
    { lang: "brainfuck", weight: 15, keywords: /[<>\+\-\.,\[\]]{10,}/ }
];

export default definePlugin({
    name: "smartCodeSnippet",
    description: "Automated code detection and formatting for a vast range of languages and frameworks.",
    authors: [{ name: "S4huan", id: 1n }],
    tags: ["Chat", "Utility", "Auto Format", "Splitter"],
    restartNeeded: true,

    start() {
        messageModule = findByProps("sendMessage", "receiveMessage");
        if (messageModule && messageModule.sendMessage) {
            origSendMessage = messageModule.sendMessage;
            messageModule.sendMessage = function (channelId: string, message: any, ...args: any[]) {
                try {
                    if (message && typeof message.content === "string") {
                        let text = message.content.trim();
                        const cb = "```";
                        
                        if (text.startsWith(cb) && text.endsWith(cb)) {
                            return origSendMessage.call(this, channelId, message, ...args);
                        }

                        let bestMatch = { lang: "", score: 0 };
                        for (let item of DICTIONARY) {
                            const matches = text.match(new RegExp(item.keywords, 'gi'));
                            const matchCount = matches ? matches.length : 0;
                            const currentScore = matchCount * item.weight;
                            
                            if (currentScore > bestMatch.score) {
                                bestMatch = { lang: item.lang, score: currentScore };
                            }
                        }

                        const codeSymbols = /([{}\[\]=><;]|\(\)|=>|===|!==|\|\||&&|<\/|\?>|\||::)/;
                        let isMultiLine = text.split("\n").length > 1;
                        let hasSymbols = codeSymbols.test(text);
                        let isCode = false;

                        if (["html", "css", "docker", "ps", "sh", "json", "yaml"].includes(bestMatch.lang) && bestMatch.score >= 11) {
                            isCode = true;
                        } else if (bestMatch.score >= 18) {
                            isCode = true;
                        } else if (isMultiLine && hasSymbols && bestMatch.score >= 5) {
                            isCode = true;
                        }

                        if (isCode) {
                            const finalLang = bestMatch.lang;
                            if (text.length > MAX_LENGTH) {
                                const chunks: string[] = [];
                                let currentChunk = "";
                                const lines = text.split("\n");
                                for (let line of lines) {
                                    if (currentChunk.length + line.length + 1 > MAX_LENGTH) {
                                        chunks.push(currentChunk);
                                        currentChunk = line;
                                    } else {
                                        currentChunk += (currentChunk ? "\n" : "") + line;
                                    }
                                }
                                if (currentChunk) chunks.push(currentChunk);

                                message.content = cb + finalLang + "\n" + chunks[0] + "\n" + cb;
                                for (let i = 1; i < chunks.length; i++) {
                                    setTimeout(() => {
                                        let nextMessage = { ...message, content: cb + finalLang + "\n" + chunks[i] + "\n" + cb };
                                        origSendMessage.call(this, channelId, nextMessage, ...args);
                                    }, i * 1000); 
                                }
                            } else {
                                message.content = cb + finalLang + "\n" + text + "\n" + cb;
                            }
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
                return origSendMessage.call(this, channelId, message, ...args);
            };
        }
    },

    stop() {
        if (messageModule && origSendMessage) {
            messageModule.sendMessage = origSendMessage;
        }
    }
});
