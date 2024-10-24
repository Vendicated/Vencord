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
import { disableStyle, enableStyle } from "@api/Styles";
import { makeRange } from "@components/PluginSettings/components";
import { debounce } from "@shared/debounce";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, ReactDOM } from "@webpack/common";
import type { Root } from "react-dom/client";

import { Magnifier, MagnifierProps } from "./components/Magnifier";
import { ELEMENT_ID } from "./constants";
import styles from "./styles.css?managed";

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
});


const imageContextMenuPatch: NavContextMenuPatchCallback = children => {
    const { square, nearestNeighbour } = settings.use(["square", "nearestNeighbour"]);

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
        </Menu.MenuGroup>
    );
};

export default definePlugin({
    name: "ImageZoom",
    description: "Lets you zoom in to images and gifs. Use scroll wheel to zoom in and shift + scroll wheel to increase lens radius / size",
    authors: [Devs.Aria],
    tags: ["ImageUtilities"],

    patches: [
        {
            find: ".contain,SCALE_DOWN:",
            replacement: {
                match: /\.slide,\i\),/g,
                replace: `$&id:"${ELEMENT_ID}",`
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

    // to stop from rendering twice /shrug
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
            id: instance.props.id,
        };
    },

    renderMagnifier(instance) {
        if (instance.props.id === ELEMENT_ID) {
            if (!this.currentMagnifierElement) {
                this.currentMagnifierElement = <Magnifier size={settings.store.size} zoom={settings.store.zoom} instance={instance} />;
                this.root = ReactDOM.createRoot(this.element!);
                this.root.render(this.currentMagnifierElement);
            }
        }
    },

    updateMagnifier(instance) {
        this.unMountMagnifier();
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
        enableStyle(styles);
        this.element = document.createElement("div");
        this.element.classList.add("MagnifierContainer");
        document.body.appendChild(this.element);
    },

    stop() {
        disableStyle(styles);
        // so componenetWillUnMount gets called if Magnifier component is still alive
        this.root && this.root.unmount();
        this.element?.remove();
    }
});
