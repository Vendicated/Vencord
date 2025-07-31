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

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { debounce } from "@shared/debounce";
import { Devs, EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { createRoot, Menu } from "@webpack/common";
import { JSX } from "react";
import type { Root } from "react-dom/client";

import { Magnifier, MagnifierProps } from "./components/Magnifier";
import { ELEMENT_ID } from "./constants";
import managedStyle from "./styles.css?managed";


interface ImageMetadata {
    filename: string;
    dimensions: string;
    size?: string;
    fetching?: boolean;
}

const imageMetadataCache = new Map<string, ImageMetadata>();

let lastClickTime = 0;
const DOUBLE_CLICK_THRESHOLD = 300;

export const settings = definePluginSettings({
    saveZoomValues: {
        type: OptionType.BOOLEAN,
        description: "Whether to save zoom and lens size values",
        default: true,
    },

    invertScroll: {
        type: OptionType.BOOLEAN,
        description: "Invert scroll",
        default: true,
    },

    nearestNeighbour: {
        type: OptionType.BOOLEAN,
        description: "Use Nearest Neighbour Interpolation when scaling images",
        default: false,
    },

    square: {
        type: OptionType.BOOLEAN,
        description: "Make the lens square",
        default: false,
    },

    zoom: {
        description: "Zoom of the lens",
        type: OptionType.SLIDER,
        markers: makeRange(1, 50, 4),
        default: 2,
        stickToMarkers: false,
    },
    size: {
        description: "Radius / Size of the lens",
        type: OptionType.SLIDER,
        markers: makeRange(50, 1000, 50),
        default: 100,
        stickToMarkers: false,
    },

    zoomSpeed: {
        description: "How fast the zoom / lens size changes",
        type: OptionType.SLIDER,
        markers: makeRange(0.1, 5, 0.2),
        default: 0.5,
        stickToMarkers: false,
    },

    showMetadata: {
        type: OptionType.BOOLEAN,
        description: "Show image metadata when double clicking on selected image",
        default: true,
    }
});


const imageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    // Discord re-uses the image context menu for links to for the copy and open buttons
    if ("href" in props) return;
    // emojis in user statuses
    if (props.target?.classList?.contains("emoji")) return;

    const { square, nearestNeighbour, showMetadata } = settings.use(["square", "nearestNeighbour", "showMetadata"]);

    children.push(
        <Menu.MenuGroup id="image-zoom">
            <Menu.MenuCheckboxItem
                id="vc-square"
                label="Square Lens"
                checked={square}
                action={() => {
                    settings.store.square = !square;
                }}
            />
            <Menu.MenuCheckboxItem
                id="vc-nearest-neighbour"
                label="Nearest Neighbour"
                checked={nearestNeighbour}
                action={() => {
                    settings.store.nearestNeighbour = !nearestNeighbour;
                }}
            />
            <Menu.MenuControlItem
                id="vc-zoom"
                label="Zoom"
                control={(props, ref) => (
                    <Menu.MenuSliderControl
                        ref={ref}
                        {...props}
                        minValue={1}
                        maxValue={50}
                        value={settings.store.zoom}
                        onChange={debounce((value: number) => settings.store.zoom = value, 100)}
                    />
                )}
            />
            <Menu.MenuControlItem
                id="vc-size"
                label="Lens Size"
                control={(props, ref) => (
                    <Menu.MenuSliderControl
                        ref={ref}
                        {...props}
                        minValue={50}
                        maxValue={1000}
                        value={settings.store.size}
                        onChange={debounce((value: number) => settings.store.size = value, 100)}
                    />
                )}
            />
            <Menu.MenuControlItem
                id="vc-zoom-speed"
                label="Zoom Speed"
                control={(props, ref) => (
                    <Menu.MenuSliderControl
                        ref={ref}
                        {...props}
                        minValue={0.1}
                        maxValue={5}
                        value={settings.store.zoomSpeed}
                        onChange={debounce((value: number) => settings.store.zoomSpeed = value, 100)}
                        renderValue={(value: number) => `${value.toFixed(3)}x`}
                    />
                )}
            />
            <Menu.MenuSeparator />
            <Menu.MenuCheckboxItem
                id="vc-show-metadata"
                label="Show Image Metadata"
                checked={showMetadata}
                action={() => {
                    settings.store.showMetadata = !showMetadata;
                }}
            />
            <Menu.MenuItem
                id="vc-view-metadata"
                label="View Metadata"
                action={() => {
                    const target = props.target as HTMLImageElement;
                    if (target && target.src) {
                        toggleMetadata(target);
                    }
                }}
            />
        </Menu.MenuGroup>
    );
};

function toggleMetadata(imgElement: HTMLImageElement) {
    if (!imgElement || !imgElement.src) return;
    const parent = imgElement.parentElement;
    if (!parent) return;

    const metadataContainer = parent.querySelector(".vc-image-metadata");
    if (metadataContainer) {
        metadataContainer.remove();
        return;
    }

    createMetadataDisplay(imgElement);
}

function createMetadataDisplay(imgElement: HTMLImageElement) {
    if (!imgElement || !imgElement.src) return;

    const { src } = imgElement;
    const parent = imgElement.parentElement;
    if (!parent) return;

    const wrapper = document.createElement("div");
    wrapper.className = "vc-image-wrapper";
    parent.insertBefore(wrapper, imgElement);
    wrapper.appendChild(imgElement);

    let metadata = imageMetadataCache.get(src);

    if (!metadata) {
        metadata = {
            filename: getFilenameFromURL(src),
            dimensions: `${imgElement.naturalWidth || imgElement.width} × ${imgElement.naturalHeight || imgElement.height} px`,
            fetching: true
        };

        imageMetadataCache.set(src, metadata);
        fetchFileSize(src).then(size => {
            if (size !== undefined) {
                const cachedMetadata = imageMetadataCache.get(src);
                if (cachedMetadata) {
                    cachedMetadata.size = formatFileSize(size);
                    cachedMetadata.fetching = false;
                    imageMetadataCache.set(src, cachedMetadata);

                    const container = parent.querySelector(".vc-image-metadata");
                    if (container) {
                        const sizeElement = container.querySelector(".vc-metadata-row:last-child span:last-child");
                        if (sizeElement) {
                            sizeElement.textContent = formatFileSize(size);
                        }
                    }
                }
            }
        });
    }

    const container = document.createElement("div");
    container.className = "vc-image-metadata";
    container.innerHTML = `
        <div class="vc-metadata-row">
            <span class="vc-metadata-label">Filename:</span>
            <span>${metadata.filename}</span>
        </div>
        <div class="vc-metadata-row">
            <span class="vc-metadata-label">Dimensions:</span>
            <span>${metadata.dimensions}</span>
        </div>
        <div class="vc-metadata-row">
            <span class="vc-metadata-label">Size:</span>
            <span>${metadata.size || "Loading..."}</span>
        </div>
    `;

    wrapper.appendChild(container);

    return container;
}

function getFilenameFromURL(url: string): string {
    try {
        const cleanUrl = url.split("?")[0];
        const parts = cleanUrl.split("/");
        return decodeURIComponent(parts[parts.length - 1]);
    } catch {
        return "Unknown";
    }
}

async function fetchFileSize(url: string): Promise<number | undefined> {
    try {
        const response = await fetch(url, { method: "HEAD" });
        return parseInt(response.headers.get("content-length") || "0");
    } catch {
        return undefined;
    }
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default definePlugin({
    name: "ImageZoom",
    description: "Lets you zoom in to images and gifs as well as displays image metadata. Use scroll wheel to zoom in and shift + scroll wheel to increase lens radius.",
    authors: [Devs.Aria, EquicordDevs.Campfire],
    tags: ["ImageUtilities"],

    managedStyle,

    patches: [
        {
            find: ".dimensionlessImage,",
            replacement: [
                {
                    match: /className:\i\.media,/,
                    replace: `id:"${ELEMENT_ID}",$&`
                },
                {
                    match: /(?<=null!=(\i)\?.{0,20})\i\.\i,{children:\1/,
                    replace: "'div',{onClick:e=>e.stopPropagation(),children:$1"
                }
            ]
        },
        {
            find: '="FOCUS_SENSITIVE",',
            replacement: {
                match: /(?<=\.hidden]:)\i/,
                replace: "false"
            }
        },
        {
            find: ".handleImageLoad)",
            replacement: [
                {
                    match: /placeholderVersion:\i,(?=.{0,50}children:)/,
                    replace: "...$self.makeProps(this),$&"
                },
                {
                    match: /componentDidMount\(\){/,
                    replace: "$&$self.renderMagnifier(this);",
                },
                {
                    match: /componentWillUnmount\(\){/,
                    replace: "$&$self.unMountMagnifier();"
                },
                {
                    match: /componentDidUpdate\(\i\){/,
                    replace: "$&$self.updateMagnifier(this);"
                }
            ]
        }
    ],

    settings,
    contextMenus: {
        "image-context": imageContextMenuPatch
    },

    currentMagnifierElement: null as React.FunctionComponentElement<MagnifierProps & JSX.IntrinsicAttributes> | null,
    element: null as HTMLDivElement | null,
    Magnifier,
    root: null as Root | null,

    makeProps(instance) {
        return {
            onMouseOver: () => this.onMouseOver(instance),
            onMouseOut: () => this.onMouseOut(instance),
            onMouseDown: (e: React.MouseEvent) => this.onMouseDown(e, instance),
            onMouseUp: () => this.onMouseUp(instance),
            onClick: (e: React.MouseEvent) => this.handleImageClick(e, instance),
            id: instance.props.id,
        };
    },

    handleImageClick(e: React.MouseEvent | MouseEvent, instance: any) {
        if (!settings.store.showMetadata) return;

        const target = e.target as HTMLImageElement;
        if (target && target.tagName === "IMG" && target.src) {
            const currentTime = new Date().getTime();
            if (currentTime - lastClickTime < DOUBLE_CLICK_THRESHOLD) {
                toggleMetadata(target);
            }
            lastClickTime = currentTime;
        }
    },

    renderMagnifier(instance) {
        try {
            if (instance.props.id === ELEMENT_ID) {
                if (!this.root) {
                    this.root = createRoot(this.element!);
                }

                this.currentMagnifierElement = <Magnifier size={settings.store.size} zoom={settings.store.zoom} instance={instance} />;
                this.root.render(this.currentMagnifierElement);
            }
        } catch (error) {
            new Logger("ImageZoom").error("Failed to render magnifier:", error);
        }
    },

    updateMagnifier(instance) {
        this.renderMagnifier(instance);
    },

    unMountMagnifier() {
        this.root?.unmount();
        this.currentMagnifierElement = null;
        this.root = null;
    },

    onMouseOver(instance) {
        instance.setState((state: any) => ({ ...state, mouseOver: true }));
    },
    onMouseOut(instance) {
        instance.setState((state: any) => ({ ...state, mouseOver: false }));
    },
    onMouseDown(e: React.MouseEvent, instance) {
        if (e.button === 0 /* left */)
            instance.setState((state: any) => ({ ...state, mouseDown: true }));
    },
    onMouseUp(instance) {
        instance.setState((state: any) => ({ ...state, mouseDown: false }));
    },

    start() {
        this.element = document.createElement("div");
        this.element.classList.add("MagnifierContainer");
        document.body.appendChild(this.element);

        const style = document.createElement("style");
        style.id = "image-metadata-styles";
        style.textContent = `
            .vc-image-metadata {
                padding: 8px;
                margin: 6px 0;
                background-color: var(--background-secondary);
                border-radius: 4px;
                font-size: 14px;
                color: var(--text-default);
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .vc-metadata-row {
                display: flex;
                justify-content: space-between;
            }

            .vc-metadata-label {
                font-weight: 600;
                margin-right: 8px;
            }
        `;
        document.head.appendChild(style);
    },

    stop() {
        // so componenetWillUnMount gets called if Magnifier component is still alive
        this.root && this.root.unmount();
        this.element?.remove();

        document.getElementById("image-metadata-styles")?.remove();
        document.querySelectorAll(".vc-image-metadata").forEach(el => el.remove());
    }
});
