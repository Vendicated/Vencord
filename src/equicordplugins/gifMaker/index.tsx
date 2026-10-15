/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { GifIcon, RemixIcon } from "@components/Icons";
import { EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { getCurrentChannel } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { saveFile } from "@utils/web";
import type { RenderModalProps } from "@vencord/discord-types";
import { Menu, Modal, openModal, React, Select, Slider, TextInput, UploadHandler, useEffect, useRef, useState } from "@webpack/common";

import { CAPTIONS } from "./captions";
import { fetchAllGoogleFonts, getFontFamilyCss, loadGoogleFont } from "./fonts";
import css from "./styles.css?managed";
import { DEFAULT_OPTIONS, type GifMakerOptions, type GoogleFontMetadata } from "./types";
import { clamp, getInitialSize, getMediaInfo } from "./utils/contextMenu";
import { cleanupBlobUrl, createGif, loadImage, loadVideo } from "./utils/encoder";
import { collectCandidateUrls, ensureGifUrl, isLikelyVideoUrl, normalizeUrl, orderCandidateUrls, stripDiscordFormatParam } from "./utils/gifPicker";

const cl = classNameFactory("vc-gifmaker-");
const logger = new Logger("gifMaker");

const settings = definePluginSettings({
    lastWidth: {
        type: OptionType.NUMBER,
        default: DEFAULT_OPTIONS.width,
        hidden: true,
        description: ""
    },
    lastHeight: {
        type: OptionType.NUMBER,
        default: DEFAULT_OPTIONS.height,
        hidden: true,
        description: ""
    },
    lastCaptionMode: {
        type: OptionType.STRING,
        default: DEFAULT_OPTIONS.captionMode,
        hidden: true,
        description: ""
    },
    lastCaptionText: {
        type: OptionType.STRING,
        default: DEFAULT_OPTIONS.captionText,
        hidden: true,
        description: ""
    },
    lastCaptionSize: {
        type: OptionType.NUMBER,
        default: DEFAULT_OPTIONS.captionSize,
        hidden: true,
        description: ""
    },
    lastFontFamily: {
        type: OptionType.STRING,
        default: DEFAULT_OPTIONS.fontFamily,
        hidden: true,
        description: ""
    },
    lastBubbleTipBase: {
        type: OptionType.NUMBER,
        default: DEFAULT_OPTIONS.bubbleTipBase,
        hidden: true,
        description: ""
    },
    maxWidth: {
        type: OptionType.NUMBER,
        default: 1024,
        description: "Maximum auto-fit width."
    },
    maxHeight: {
        type: OptionType.NUMBER,
        default: 576,
        description: "Maximum auto-fit height."
    },
});

const GIFMAKER_ID = "vc-gifmaker";

function resolveInitialSize(sourceWidth?: number, sourceHeight?: number, storedWidth?: number, storedHeight?: number): [number, number] {
    return getInitialSize(settings.store.maxWidth, settings.store.maxHeight, sourceWidth, sourceHeight, storedWidth, storedHeight);
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const info = getMediaInfo(props);
    if (!info) return;

    children.push(
        <Menu.MenuItem
            id={GIFMAKER_ID}
            label="Make GIF"
            icon={GifIcon}
            leadingAccessory={{ type: "icon", icon: GifIcon }}
            action={() => openModal(modalProps => (
                <GifMakerModal url={info.url} isVideo={info.isVideo} sourceWidth={info.sourceWidth} sourceHeight={info.sourceHeight} {...modalProps} />
            ))}
        />
    );
};

const imageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props?.src) return;
    if ("href" in props && !props.src) return;
    if (props.target?.classList?.contains("emoji")) return;

    const info = getMediaInfo(props);
    if (!info) return;

    children.push(
        <Menu.MenuItem
            id={GIFMAKER_ID}
            label="Make GIF"
            icon={GifIcon}
            leadingAccessory={{ type: "icon", icon: GifIcon }}
            action={() => openModal(modalProps => <GifMakerModal url={info.url} isVideo={info.isVideo} sourceWidth={info.sourceWidth} sourceHeight={info.sourceHeight} {...modalProps} />)}
        />
    );
};

const gifPickerContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props?.src) return;

    children.push(
        <Menu.MenuItem
            id="gif-maker-edit"
            key="gif-maker-edit"
            label="Edit GIF"
            icon={RemixIcon}
            leadingAccessory={{ type: "icon", icon: RemixIcon }}
            action={() => openGifMakerFromItem(props)}
        />
    );
};

interface SelectOption {
    key: string;
    label: string;
    value: string;
}

function FontOptionLabel({ option }: { option: SelectOption; }) {
    React.useEffect(() => {
        void loadGoogleFont(option.value);
    }, [option.value]);

    return (
        <span style={{ fontFamily: getFontFamilyCss(option.value) }}>
            {option.label}
        </span>
    );
}

function SelectedFontLabel({ options }: { options: SelectOption[]; }) {
    const option = options[0];
    return option ? <FontOptionLabel option={option} /> : null;
}

function FontSelector({ initialFont, onSelect }: { initialFont: string; onSelect: (font: GoogleFontMetadata) => void; }) {
    const [fonts, setFonts] = React.useState<GoogleFontMetadata[]>([]);
    const [selectedFont, setSelectedFont] = React.useState<string | null>(initialFont !== "Arial" ? initialFont : null);

    React.useEffect(() => {
        void fetchAllGoogleFonts().then(fetchedFonts => {
            setFonts(fetchedFonts);
        });
    }, []);

    const options = fonts.map<SelectOption>(font => ({
        key: font.family,
        label: font.displayName,
        value: font.family
    }));

    const handleSelect = (fontFamily: string) => {
        setSelectedFont(fontFamily);

        const font = fonts.find(entry => entry.family === fontFamily);
        if (!font) return;

        void loadGoogleFont(fontFamily);
        onSelect(font);
    };

    if (!fonts.length) {
        return <div>Loading fonts...</div>;
    }

    return (
        <Select
            placeholder="Select a font..."
            options={options}
            maxVisibleItems={10}
            closeOnSelect={true}
            select={handleSelect}
            isSelected={value => value === selectedFont}
            serialize={value => String(value)}
            renderOptionLabel={(option: SelectOption) => <FontOptionLabel option={option} />}
            renderOptionValue={(options: SelectOption[]) => <SelectedFontLabel options={options} />}
        />
    );
}

function GifMakerModal({ url, isVideo, sourceWidth, sourceHeight, ...props }: RenderModalProps & { url: string; isVideo: boolean; sourceWidth?: number; sourceHeight?: number; }) {

    const [options, setOptions] = useState<GifMakerOptions>(() => {
        const [width, height] = resolveInitialSize(sourceWidth, sourceHeight, settings.store.lastWidth, settings.store.lastHeight);
        return {
            width, height,
            captionMode: settings.store.lastCaptionMode as GifMakerOptions["captionMode"],
            captionText: settings.store.lastCaptionText,
            captionSize: settings.store.lastCaptionSize,
            fontFamily: settings.store.lastFontFamily as string || DEFAULT_OPTIONS.fontFamily,
            bubbleTipX: DEFAULT_OPTIONS.bubbleTipX,
            bubbleTipY: DEFAULT_OPTIONS.bubbleTipY,
            bubbleTipBase: settings.store.lastBubbleTipBase,
        };
    });

    const [gifBlob, setGifBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const previewRef = useRef<HTMLImageElement>(null);
    const optionsRef = useRef(options);
    const generationRef = useRef(0);
    optionsRef.current = options;

    const patch = (partial: Partial<GifMakerOptions>) => {
        setOptions(prev => {
            const next = { ...prev, ...partial };
            settings.store.lastWidth = next.width;
            settings.store.lastHeight = next.height;
            settings.store.lastCaptionMode = next.captionMode;
            settings.store.lastCaptionText = next.captionText;
            settings.store.lastCaptionSize = next.captionSize;
            settings.store.lastFontFamily = next.fontFamily;
            settings.store.lastBubbleTipBase = next.bubbleTipBase;
            return next;
        });
    };

    useEffect(() => {
        if (sourceWidth && sourceHeight) {
            const [w, h] = resolveInitialSize(sourceWidth, sourceHeight);
            setOptions(prev => ({ ...prev, width: w, height: h }));
            return;
        }
        if (isVideo) {
            loadVideo(url).then(v => {
                const [w, h] = resolveInitialSize(v.videoWidth, v.videoHeight);
                setOptions(prev => ({ ...prev, width: w, height: h }));
                cleanupBlobUrl(v);
                v.remove();
            }).catch(err => logger.error("auto-detect video failed", err));
            return;
        }
        loadImage(url).then(img => {
            const [w, h] = resolveInitialSize(img.naturalWidth, img.naturalHeight);
            setOptions(prev => ({ ...prev, width: w, height: h }));
            cleanupBlobUrl(img);
        }).catch(err => logger.error("auto-detect image failed", err));
    }, [sourceWidth, sourceHeight]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const gen = ++generationRef.current;
            setGenerating(true);

            const { current } = optionsRef;
            createGif(url, isVideo, current).then(blob => {
                if (gen !== generationRef.current) return;
                setError(null);
                setGifBlob(blob);
                setPreviewUrl(prev => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(blob);
                });
                setGenerating(false);
            }).catch((err: unknown) => {
                if (gen !== generationRef.current) return;
                logger.error("GIF generation failed", err);
                setError(err instanceof Error ? err.message : String(err));
                setGenerating(false);
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [options.captionMode, options.captionText, options.captionSize, options.fontFamily, options.bubbleTipX, options.bubbleTipY, options.bubbleTipBase, options.width, options.height]);

    const handlePreviewClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (options.captionMode !== "speechbubble") return;
        const img = previewRef.current;
        if (!img) return;

        const rect = img.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * options.width;
        const y = (e.clientY - rect.top) / rect.height * options.height;
        patch({ bubbleTipX: x, bubbleTipY: y });
    };

    const handleExport = () => {
        if (!gifBlob) return;
        saveFile(new File([gifBlob], "export.gif", { type: "image/gif" }));
    };

    const handleSend = () => {
        if (!gifBlob) return;

        const channel = getCurrentChannel();
        if (!channel) return;

        const file = new File([gifBlob], "export.gif", { type: "image/gif" });
        UploadHandler.promptToUpload([file], channel, 0);
        props.onClose?.();
    };

    return (
        <Modal
            {...props}
            size="lg"
            title="Make GIF"
            actions={[
                {
                    text: "Send",
                    variant: "primary",
                    onClick: handleSend
                },
                {
                    text: "Export",
                    variant: "primary",
                    onClick: handleExport
                }
            ]}
        >
            <div className={cl("modal-body")}>
                <div className={cl("preview-section")}>
                    <div className={cl("preview-wrapper")}>
                        <img
                            ref={previewRef}
                            alt="GIF preview"
                            src={previewUrl ?? ""}
                            onClick={handlePreviewClick}
                            className={cl("preview", { "preview-generating": generating, "preview-crosshair": options.captionMode === "speechbubble" })}
                        />

                        {generating && (
                            <div className={cl("generating-overlay")}>
                                Generating GIF...
                            </div>
                        )}

                        {error && !generating && (
                            <div className={cl("error-overlay")}>
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                <div className={cl("controls-section")}>
                    <div className={cl("section-heading")}>Captions</div>
                    <div style={{ display: "flex", gap: 8 }} className={Margins.bottom16}>
                        {CAPTIONS.map(c => (
                            <Button
                                key={c.type}
                                size="min"
                                onClick={() => patch({ captionMode: c.type })}
                                variant={options.captionMode === c.type ? "primary" : "secondary"}
                            >
                                {c.name}
                            </Button>
                        ))}
                    </div>

                    {options.captionMode === "caption" && (
                        <div className={cl("section")}>
                            <div className={Margins.bottom16}>
                                <label className={cl("label")}>Text</label>
                                <TextInput
                                    value={options.captionText}
                                    onChange={v => patch({ captionText: v })}
                                    placeholder="Enter caption..."
                                />
                            </div>
                            <div className="vc-gifmaker-font-range">
                                <div>Font</div>
                                <div className={cl("font-selector")}>
                                    <FontSelector
                                        initialFont={options.fontFamily}
                                        onSelect={font => {
                                            patch({ fontFamily: font.family });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="vc-gifmaker-font-range">
                                <div>Font size</div>
                                <Slider
                                    initialValue={options.captionSize}
                                    onValueChange={v => patch({ captionSize: v })}
                                    markers={[10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                                    minValue={10}
                                    maxValue={100}
                                />
                                <span>{(options.captionSize).toFixed(2)}px</span>
                            </div>
                        </div>
                    )}

                    {options.captionMode === "speechbubble" && (
                        <div className={cl("section")}>
                            <div className={cl("section-hint")}>
                                Click on the preview to position the bubble tip
                            </div>
                            <div className="vc-gifmaker-font-range">
                                <div>Tip Base</div>
                                <Slider
                                    initialValue={Math.round(options.bubbleTipBase * 100)}
                                    onValueChange={v => patch({ bubbleTipBase: v / 100 })}
                                    minValue={0}
                                    maxValue={80}
                                />
                                <span>{Math.round(options.bubbleTipBase * 100)}%</span>
                            </div>
                        </div>
                    )}

                    <div className={cl("section-heading")}>Dimensions</div>
                    <div className={cl("dims-row")}>
                        <div className={cl("field")}>
                            <label className={cl("label")}>Width</label>
                            <input
                                type="number"
                                min={32}
                                max={1024}
                                value={options.width}
                                onChange={e => patch({ width: Number(e.target.value) })}
                                onBlur={e => patch({ width: clamp(Number(e.target.value), 32, 1024, 32) })}
                                className={cl("input")}
                                aria-label="Width"
                            />
                        </div>
                        <div className={cl("field")}>
                            <label className={cl("label")}>Height</label>
                            <input
                                type="number"
                                min={32}
                                max={1024}
                                value={options.height}
                                onChange={e => patch({ height: Number(e.target.value) })}
                                onBlur={e => patch({ height: clamp(Number(e.target.value), 32, 1024, 32) })}
                                className={cl("input")}
                                aria-label="Height"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

function openGifMakerFromItem(item) {
    const directUrl = typeof item.url === "string" ? item.url : typeof item.src === "string" ? item.src : null;

    const candidates = collectCandidateUrls(item);
    const adjustedCandidates = new Set<string>();
    if (directUrl) adjustedCandidates.add(normalizeUrl(directUrl));
    for (const candidate of candidates) {
        adjustedCandidates.add(candidate);
    }

    const preferredUrl = directUrl ? normalizeUrl(directUrl) : null;
    const orderedUrls = orderCandidateUrls(preferredUrl, adjustedCandidates);
    if (!orderedUrls.length) return;

    const firstUrl = ensureGifUrl(orderedUrls[0]);
    const cleanedUrl = stripDiscordFormatParam(firstUrl);
    const isVideo = isLikelyVideoUrl(cleanedUrl);

    openModal(modalProps => (
        <GifMakerModal url={cleanedUrl} isVideo={isVideo} {...modalProps} />
    ));
}

migratePluginSettings("GifMaker", "gifMaker");
export default definePlugin({
    name: "GifMaker",
    description: "Create and caption GIFs from any media in chat or the GIF picker.",
    authors: [EquicordDevs.Leon135, EquicordDevs.benjii],
    tags: ["Emotes", "Media"],
    settings,
    managedStyle: css,
    contextMenus: {
        "message": messageContextMenuPatch,
        "image-context": imageContextMenuPatch,
        "gif-picker": gifPickerContextMenuPatch
    },

    start() {
        void fetchAllGoogleFonts();
    },
});
