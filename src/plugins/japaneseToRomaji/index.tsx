/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin, { OptionType } from "@utils/types";
import { useLayoutEffect, useRef, useState } from "@webpack/common";

import { loadKanaMap } from "./kana";
import type { KanjiInfo } from "./kanji";
// eslint-disable-next-line no-duplicate-imports
import { isDictReady, loadDict, lookupKanji, onReady } from "./kanji";
import type { RenderOptions } from "./romaji";
// eslint-disable-next-line no-duplicate-imports
import { containsJapanese, renderRubyText } from "./romaji";

const settings = definePluginSettings({
    annotateKanji: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show romaji readings under kanji characters",
    },
    annotateKana: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show romaji readings under kana characters",
    },
    showTooltip: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show kanji info tooltip on hover",
    },
    readingPreference: {
        type: OptionType.SELECT,
        default: "kun",
        description: "Preferred reading for kanji",
        options: [
            { label: "Kun'yomi (訓読み)", value: "kun" },
            { label: "On'yomi (音読み)", value: "on" },
        ],
    },
    rubyFontSize: {
        type: OptionType.NUMBER,
        default: 75,
        description: "Ruby annotation font size (%)",
        isValid: (v: number) => v >= 30 && v <= 200,
    },
    tooltipFontSize: {
        type: OptionType.NUMBER,
        default: 85,
        description: "Tooltip font size (%)",
        isValid: (v: number) => v >= 50 && v <= 200,
    },
    dictUrl: {
        type: OptionType.STRING,
        default: "https://raw.githubusercontent.com/RaylaValdez/jp-kanji/refs/heads/main/kanji.json",
        description: "URL to fetch the kanji dictionary JSON from",
    },
    kanaUrl: {
        type: OptionType.STRING,
        default: "https://raw.githubusercontent.com/RaylaValdez/jp-kanji/refs/heads/main/kana.json",
        description: "URL to fetch the kana→romaji mapping JSON from",
    },
});

interface RubyAnnotatorProps {
    message?: {
        content?: string;
    };
}

interface TooltipState {
    x: number;
    y: number;
    kanji: string;
    info: KanjiInfo;
}

const RubyAnnotator: React.FC<RubyAnnotatorProps> = ({ message }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const [dictReady, setDictReady] = useState(isDictReady);

    useLayoutEffect(() => {
        loadDict(settings.store.dictUrl);
        loadKanaMap(settings.store.kanaUrl);
        onReady(() => setDictReady(true));
    }, []);

    useLayoutEffect(() => {
        if (!ref.current) return;
        const container = ref.current.parentElement;
        if (!container) return;

        const existing = container.querySelectorAll("[data-jp-ruby]");
        for (const span of existing) {
            const text = document.createTextNode(span.textContent || "");
            span.parentNode?.replaceChild(text, span);
        }

        const content = message?.content;
        if (!content || !containsJapanese(content)) return;

        const renderOptions: RenderOptions = {
            annotateKanji: dictReady && settings.store.annotateKanji,
            annotateKana: settings.store.annotateKana,
            readingPreference: settings.store.readingPreference as "kun" | "on",
        };

        container.style.setProperty("--jp-ruby-font-size", `${settings.store.rubyFontSize / 100}em`);
        container.style.setProperty("--jp-tooltip-font-size", `${settings.store.tooltipFontSize / 100}em`);

        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    if (ref.current?.contains(node))
                        return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const modifications: Array<{ node: Text; html: string; }> = [];
        let node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
            const text = node.textContent || "";
            if (!containsJapanese(text)) continue;
            modifications.push({ node, html: renderRubyText(text, renderOptions) });
        }

        for (const { node, html } of modifications) {
            const span = document.createElement("span");
            span.setAttribute("data-jp-ruby", "");
            span.innerHTML = html;
            node.parentNode?.replaceChild(span, node);
        }

        const handleKanjiEnter = (e: Event) => {
            if (!settings.store.showTooltip) return;
            const el = e.currentTarget as HTMLElement;
            const char = el.getAttribute("data-kanji") || "";
            const info = lookupKanji(char);
            if (info) {
                const mx = (e as MouseEvent).clientX;
                const my = (e as MouseEvent).clientY;
                setTooltip({
                    x: Math.min(mx, window.innerWidth - 160),
                    y: Math.max(40, my),
                    kanji: char,
                    info,
                });
            }
        };
        const handleKanjiLeave = () => setTooltip(null);

        const kanjiEls = container.querySelectorAll("[data-kanji]");
        kanjiEls.forEach(el => {
            el.addEventListener("mouseenter", handleKanjiEnter);
            el.addEventListener("mouseleave", handleKanjiLeave);
        });

        return () => {
            kanjiEls.forEach(el => {
                el.removeEventListener("mouseenter", handleKanjiEnter);
                el.removeEventListener("mouseleave", handleKanjiLeave);
            });
        };
    }, [message?.content, dictReady]);

    return (
        <>
            <div ref={ref} style={{ display: "none" }} />
            {tooltip && (
                <div className="jp-kanji-tooltip" style={{
                    position: "fixed",
                    left: tooltip.x,
                    top: tooltip.y - 8,
                    transform: "translateY(-100%)",
                    zIndex: 1000,
                    pointerEvents: "none",
                }}>
                    <div className="jp-kanji-tooltip-char">{tooltip.kanji}</div>
                    {tooltip.info.kun.length > 0 && (
                        <div className="jp-kanji-tooltip-row">
                            <span className="jp-kanji-tooltip-label">訓</span>
                            <span>{tooltip.info.kun.join("、")}</span>
                        </div>
                    )}
                    {tooltip.info.on.length > 0 && (
                        <div className="jp-kanji-tooltip-row">
                            <span className="jp-kanji-tooltip-label">音</span>
                            <span>{tooltip.info.on.join("、")}</span>
                        </div>
                    )}
                    <div className="jp-kanji-tooltip-row" style={{ opacity: 0.7 }}>
                        <span>{tooltip.info.meanings.join(", ")}</span>
                    </div>
                </div>
            )}
        </>
    );
};

export default definePlugin({
    name: "JapaneseToRomaji",
    description: "Shows romaji under Japanese characters in messages",
    authors: [{
        name: "gerry_of_ravine",
        id: 294899635292602379n
    }],

    settings,

    patches: [
        {
            find: ".SEND_FAILED,",
            replacement: {
                match: /\]:\i.isUnsupported.{0,20}?,children:\[/,
                replace: "$&arguments[0]?.message?.content&&$self.RubyAnnotation({message: arguments[0].message}),"
            }
        }
    ],

    RubyAnnotation: ErrorBoundary.wrap(RubyAnnotator),
});
