/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { debounce } from "@shared/debounce";
import { EquicordDevs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Card, Forms, React, TextInput } from "@webpack/common";
interface GoogleFontMetadata {
    family: string;
    displayName: string;
    authors: string[];
    category?: number;
    popularity?: number;
    variants: Array<{
        axes: Array<{
            tag: string;
            min: number;
            max: number;
        }>;
    }>;
}
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36(KHTML, like Gecko) Chrome / 128.0.0.0 Safari / 537.36";
async function searchGoogleFonts(query: string) {
    try {
        const response = await fetch("https://fonts.google.com/$rpc/fonts.fe.catalog.actions.metadata.MetadataService/FontSearch", {
            method: "POST",
            headers: {
                "content-type": "application/json+protobuf",
                "x-user-agent": "grpc-web-javascript/0.1"
            },
            // the nulls are optional filters
            body: JSON.stringify([[query, null, null, null, null, null, 1], [5], null, 16])
        });

        const data = await response.json();
        if (!data?.[1]) return [];
        // god please help me
        const fonts = data[1].map(([_, fontData]: [string, any[]]) => ({
            family: fontData[0],
            displayName: fontData[1],
            authors: fontData[2],
            category: fontData[3],
            variants: fontData[6].map((variant: any[]) => ({
                axes: variant[0].map(([tag, min, max]: [string, number, number]) => ({
                    tag, min, max
                }))
            }))
        }));
        return fonts;
        // LETS GO IT FUCKING WORKSSSSSSSSSSSS
    } catch (err) {
        console.error("Failed to fetch fonts:", err);
        return [];
    }
}

async function preloadFont(family: string) {
    // https://developers.google.com/fonts/docs/css2
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=The quick brown fox jumps over the lazy dog&display=swap`;
    const css = await fetch(url, {
        headers: {
            "User-Agent": userAgent
        }
    }).then(r => r.text());

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    return style;
}

async function applyFont(fontFamily: string) {
    if (!fontFamily) {
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }
        return;
    }

    try {
        const response = await fetch(
            `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700&display=swap`,
            {
                headers: {
                    "User-Agent": userAgent
                }
            }
        );
        const css = await response.text();

        if (!styleElement) {
            styleElement = document.createElement("style");
            document.head.appendChild(styleElement);
        }

        styleElement.textContent = `
                ${css}
                * {
                    --font-primary: '${fontFamily}', sans-serif !important;
                    --font-display: '${fontFamily}', sans-serif !important;
                    --font-headline: '${fontFamily}', sans-serif !important;
                    --font-code: '${fontFamily}', monospace !important;
                }
            `;
    } catch (err) {
        console.error("Failed to load font:", err);
    }
}

function GoogleFontSearch({ onSelect }: { onSelect: (font: GoogleFontMetadata) => void; }) {
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<GoogleFontMetadata[]>([]);
    const [loading, setLoading] = React.useState(false);


    const previewStyles = React.useRef<HTMLStyleElement[]>([]);


    React.useEffect(() => {
        return () => {
            previewStyles.current.forEach(style => style.remove());
        };
    }, []);

    const debouncedSearch = debounce(async (value: string) => {
        setLoading(true);
        if (!value) {
            setResults([]);
            setLoading(false);
            return;
        }
        const fonts = await searchGoogleFonts(value);

        previewStyles.current.forEach(style => style.remove());
        previewStyles.current = [];

        const styles = await Promise.all(fonts.map(f => preloadFont(f.family)));
        previewStyles.current = styles;

        setResults(fonts);
        setLoading(false);
    }, 300);

    const handleSearch = React.useCallback((value: string) => {
        setQuery(value);
        debouncedSearch(value);
    }, []);

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Search Google Fonts</Forms.FormTitle>
            <Forms.FormText>Click on any font to apply it.</Forms.FormText>

            <TextInput
                value={query}
                onChange={e => handleSearch(e)}
                placeholder="Search fonts..."
                disabled={loading}
                className={Margins.bottom16}
            />

            {results.length > 0 && (
                <div className={classes(Margins.top8, "eq-googlefonts-results")}>
                    {results.map(font => (
                        <Card
                            key={font.family}
                            className={classes("eq-googlefonts-card", Margins.bottom8)}
                            onClick={() => onSelect(font)}
                        >
                            <div className="eq-googlefonts-preview" style={{ fontFamily: font.family }}>
                                <Forms.FormTitle tag="h4">{font.displayName}</Forms.FormTitle>
                                <Forms.FormText>The quick brown fox jumps over the lazy dog</Forms.FormText>
                            </div>
                            {font.authors?.length && (
                                <Forms.FormText className={Margins.top8} style={{ opacity: 0.7 }}>
                                    by {font.authors.join(", ")}
                                </Forms.FormText>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </Forms.FormSection>
    );
}

let styleElement: HTMLStyleElement | null = null;

const settings = definePluginSettings({
    selectedFont: {
        type: OptionType.STRING,
        description: "Currently selected font",
        default: "",
        hidden: true
    },
    fontSearch: {
        type: OptionType.COMPONENT,
        description: "Search and select Google Fonts",
        component: () => (
            <GoogleFontSearch
                onSelect={font => {
                    settings.store.selectedFont = font.family;
                    applyFont(font.family);
                }}
            />
        )
    }
});

export default definePlugin({
    name: "FontLoader",
    description: "Loads any font from Google Fonts",
    authors: [EquicordDevs.Crxa, EquicordDevs.vmohammad], // Crxa's only here because he came up with the idea
    settings,

    async start() {
        const savedFont = settings.store.selectedFont;
        if (savedFont) {
            await applyFont(savedFont);
        }
    },

    stop() {
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }
    }
});
