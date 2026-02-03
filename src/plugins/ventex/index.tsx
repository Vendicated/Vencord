import "./katex.css";

import { Devs } from "@utils/constants";
import definePlugin, { ReporterTestable } from "@utils/types";
import { makeLazy } from "@utils/lazy";
import { React, useEffect, useMemo, useState } from "@webpack/common";

// @ts-expect-error
export const getKatex = /* #__PURE__*/ makeLazy(async () => (await import("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.mjs")).default);

export function useKatex() {
    const [katex, setKatex] = useState();
    useEffect(() => {
        if (katex === undefined)
            getKatex().then(setKatex);
    });
    return katex;
}

// @ts-expect-error
export const getDomPurify = /* #__PURE__*/ makeLazy(async () => (await import("https://cdn.jsdelivr.net/npm/dompurify@3.1.7/dist/purify.es.mjs")).default);

export function useDomPurify() {
    const [domPurify, setDomPurify] = useState();
    useEffect(() => {
        if (domPurify === undefined)
            getDomPurify().then(setDomPurify);
    });
    return domPurify;
}

export interface HighlighterProps {
    lang?: string;
    content: string;
    isPreview: boolean;
    tempSettings?: Record<string, any>;
}

export default definePlugin({
    name: "KaTeX",
    description: "TeX typesetting in discord",
    authors: [Devs.skyevg],
    reporterTestable: ReporterTestable.Patches,

    patches: [
        {
            find: "codeBlock:{react(",
            replacement: {
                match: /codeBlock:\{react\((\i),(\i),(\i)\)\{/,
                replace: "$&if($1.lang == 'latex' || $1.lang == 'tex') return $self.createBlock($1,$2,$3);"
            }
        },
        {
            find: "inlineCode:{react:(",
            replacement: {
                match: /inlineCode:\{react:\((\i),(\i),(\i)\)=>/,
                replace: "$&($1.content.startsWith('$$') && $1.content.endsWith('$$'))?$self.createInline($1,$2,$3):"
            }
        }
    ],
    start: async () => {
        useKatex();
        useDomPurify();
    },
    stop: () => {
    },

    createBlock: (props: HighlighterProps) => (
        <LazyLatex displayMode formula={props.content} />
    ),
    createInline: (props: HighlighterProps) => (
        <LazyLatex formula={props.content.substring(1, props.content.length - 1)} />
    ),
});

function LazyLatex(props) {
    const { formula } = props;
    const katex = useKatex();
    const domPurify = useDomPurify();
    return katex && domPurify
        ? <Latex {...props} katex={katex} domPurify={domPurify} />
        : <code>{formula}</code>;
}

function Latex({ katex, formula, displayMode, domPurify }) {
    const result = useMemo(() => {
        const html = katex.renderToString(formula, {
            displayMode,
            throwOnError: false
        });
        return domPurify.sanitize(html);
    }, [formula, displayMode]);

    return displayMode
        ? <div className="tex" dangerouslySetInnerHTML={{ __html: result }} />
        : <span className="tex" dangerouslySetInnerHTML={{ __html: result }} />;
}