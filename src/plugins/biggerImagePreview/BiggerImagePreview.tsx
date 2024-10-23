/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { makeRange } from "@components/PluginSettings/components";
import { Menu } from "@webpack/common";

const settings = definePluginSettings({
    enlargeGifs: {
        type: OptionType.BOOLEAN,
        description: "Enlarge GIFs when clicked.",
        default: true
    },
    sizeMultiplier: {
        type: OptionType.SLIDER,
        description: "Adjust the size of images and GIFs. Minimum is original size, maximum scales to window size.",
        markers: makeRange(0, 1, 0.1),
        default: 1,
        stickToMarkers: true,
    }
});

const imageContextMenuPatch: NavContextMenuPatchCallback = (children) => {
    const { enlargeGifs, sizeMultiplier } = settings.use(["enlargeGifs", "sizeMultiplier"]);

    children.push(
        <Menu.MenuGroup id="bigger-image-preview">
            <Menu.MenuCheckboxItem
                id="enlarge-gifs"
                label="Enlarge GIFs"
                checked={enlargeGifs}
                action={() => {
                    settings.store.enlargeGifs = !enlargeGifs;
                }}
            />
            <Menu.MenuControlItem
                id="size-multiplier"
                label="Size Multiplier"
                control={(props, ref) => (
                    <Menu.MenuSliderControl
                        ref={ref}
                        {...props}
                        minValue={0}
                        maxValue={1}
                        value={sizeMultiplier}
                        onChange={(value: number) => {
                            settings.store.sizeMultiplier = value;
                        }}
                    />
                )}
            />
        </Menu.MenuGroup>
    );
};


export default definePlugin({
    name: "BiggerImagePreview",
    description: "Desplays images and GIFs larger when clicked.",
    authors: [{ name: "sheetau", id: 303477749971156992n }],
    settings,
    contextMenus: {
        "image-context": imageContextMenuPatch
    },

    start() {
        let style = document.querySelector('#image-preview-style') as HTMLStyleElement || document.createElement('style');
        style.id = 'image-preview-style';
        document.head.appendChild(style);

        const mapValue = (value, minRange, maxRange) => minRange + value * (maxRange - minRange);
        const applyStyles = (media: HTMLImageElement | HTMLVideoElement) => {
            const { naturalWidth, naturalHeight } = media instanceof HTMLImageElement ? media : {
                naturalWidth: media.videoWidth,
                naturalHeight: media.videoHeight
            };
            const maxWidth = window.innerWidth - 150;
            const maxHeight = window.innerHeight - 60;

            const calculatedWidth = naturalWidth / naturalHeight > maxWidth / maxHeight ? maxWidth : (naturalWidth / naturalHeight) * maxHeight;
            const calculatedHeight = naturalWidth / naturalHeight > maxWidth / maxHeight ? (naturalHeight / naturalWidth) * maxWidth : maxHeight;

            const multiplierWidth = mapValue(settings.store.sizeMultiplier, 1, calculatedWidth / naturalWidth)
            const multiplierHeight = mapValue(settings.store.sizeMultiplier, 1, calculatedHeight / naturalHeight)

            style.textContent = `
                .layerContainer_cd0de5 .imageWrapper_d4597d {
                    width: ${naturalWidth * multiplierWidth}px !important;
                    height: ${naturalHeight * multiplierHeight}px !important;
                    margin-top: 20px !important;
                }
                .layerContainer_cd0de5 .optionsContainer_a15d41 {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: center;
                    flex-wrap: nowrap;
                    margin-top: 8px;
                    gap: 30px;
                }
                .layerContainer_cd0de5 .imageWrapper_d4597d .loadingOverlay_d4597d .slide_f97a12,
                .layerContainer_cd0de5 .imageWrapper_d4597d .loadingOverlay_d4597d .embedVideo_b0068a {
                    width: 100% !important;
                    height: 100% !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                    object-fit: contain;
                }
            `;
        };

        const observeMedia = () => {
            const img = document.querySelector('.layerContainer_cd0de5 .imageWrapper_d4597d .loadingOverlay_d4597d .slide_f97a12') as HTMLImageElement;
            const video = document.querySelector('.layerContainer_cd0de5 .imageWrapper_d4597d .loadingOverlay_d4597d .embedVideo_b0068a') as HTMLVideoElement;

            if (img) {
                const imgSrc = img.src.split('?')[0];
                if (settings.store.enlargeGifs || !(imgSrc.endsWith('.gif') || imgSrc.endsWith('.mp4'))) {
                    img.complete ? applyStyles(img) : img.addEventListener('load', () => applyStyles(img));
                } else {
                    style.textContent = `
                        .layerContainer_cd0de5 .optionsContainer_a15d41 {
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            justify-content: center;
                            flex-wrap: nowrap;
                            margin-top: 8px;
                            gap: 30px;
                        }
                    `;
                }
            }

            if (video) {
                if (settings.store.enlargeGifs) {
                    video.readyState === 4 ? applyStyles(video) : video.addEventListener('loadeddata', () => applyStyles(video));
                } else {
                    style.textContent = `
                        .layerContainer_cd0de5 .optionsContainer_a15d41 {
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            justify-content: center;
                            flex-wrap: nowrap;
                            margin-top: 8px;
                            gap: 30px;
                        }
                    `;
                }
            }
        };

        const observer = new MutationObserver(observeMedia);
        observer.observe(document.body, { childList: true, subtree: true });

        observeMedia();
        window.addEventListener('resize', observeMedia);
    },

    stop() {
        const style = document.querySelector('#image-preview-style');
        if (style) style.parentNode?.removeChild(style);
    },
});

