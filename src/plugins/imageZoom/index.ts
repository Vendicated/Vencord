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

import "./styles.css";

import { definePluginSettings } from "@api/settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, ReactDOM } from "@webpack/common";

import { Magnifier, MagnifierProps } from "./components/Magnifier";
import { ELEMENT_ID } from "./constants";

export const settings = definePluginSettings({
    saveZoomValues: {
        type: OptionType.BOOLEAN,
        description: "Whether to save zoom and lens size values",
        default: true,
    },

    preventCarouselFromClosingOnClick: {
        type: OptionType.BOOLEAN,
        // Thanks chat gpt
        description: "Allow the image modal in the image slideshow thing / carousel to remain open when clicking on the image",
        default: true,
    },

    invertScroll: {
        type: OptionType.BOOLEAN,
        description: "Invert scroll",
        default: true,
    },

    zoom: {
        description: "Zoom of the lens",
        type: OptionType.SLIDER,
        markers: makeRange(1, 10, 0.5),
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
        markers: makeRange(0.1, 3, 0.1),
        default: 0.5,
        stickToMarkers: false,
    },
});

export default definePlugin({
    name: "ImageZoom",
    description: "Lets you zoom in to images and gifs. Use scroll wheel to zoom in and shift + scroll wheel to increase lens radius / size",
    authors: [Devs.Aria],
    patches: [
        {
            find: "\"renderLinkComponent\",\"maxWidth\"",
            replacement: {
                match: /(return\(.{1,100}\(\)\.wrapper.{1,100})(src)/,
                replace: `$1id: '${ELEMENT_ID}',$2`
            }
        },

        {
            find: "handleImageLoad=",
            replacement: [
                {
                    match: /(render=function\(\){.{1,300}limitResponsiveWidth(.|\n){1,600})onMouseEnter:/,
                    replace:
                        `$1onMouseOver: () => $self.onMouseOver(this),
                    onMouseOut: () => $self.onMouseOut(this),
                    onMouseDown: () => $self.onMouseDown(this),
                    onMouseUp: () => $self.onMouseUp(this),
                    id: this.props.id,
                    onMouseEnter:`

                },

                {
                    match: /(componentDidMount=function\(\){)/,
                    replace: "$1$self.renderMagnifier(this);",
                },

                {
                    match: /(componentWillUnmount=function\(\){)/,
                    replace: "$1$self.unMountMagnifier();"
                }
            ]
        },

        {
            find: ".carouselModal,",
            replacement: {
                match: /onClick:(\i),/,
                replace: "onClick:$self.preventCarouselFromClosingOnClick ? () => {} : $1,"
            }
        }
    ],

    settings,

    // to stop from rendering twice /shrug
    currentMagnifierElement: null as React.FunctionComponentElement<MagnifierProps & JSX.IntrinsicAttributes> | null,
    element: null as HTMLDivElement | null,

    Magnifier,

    renderMagnifier(instance) {
        if (instance.props.id === ELEMENT_ID) {
            if (!this.currentMagnifierElement) {
                this.currentMagnifierElement = React.createElement(Magnifier, {
                    size: settings.store.size,
                    zoom: settings.store.zoom,
                    instance
                });
                ReactDOM.render(this.currentMagnifierElement, this.element);
            }
        }
    },

    unMountMagnifier() {
        if (this.currentMagnifierElement) {
            ReactDOM.unmountComponentAtNode(this.element!);
            this.currentMagnifierElement = null;
        }
    },

    onMouseOver(instance) {
        instance.setState((state: any) => ({ ...state, mouseOver: true }));
    },
    onMouseOut(instance) {
        instance.setState((state: any) => ({ ...state, mouseOver: false }));
    },
    onMouseDown(instance) {
        instance.setState((state: any) => ({ ...state, mouseDown: true }));
    },
    onMouseUp(instance) {
        instance.setState((state: any) => ({ ...state, mouseDown: false }));
    },

    start() {
        this.element = document.createElement("div");
        this.element.classList.add("MagnifierContainer");
        document.getElementById("app-mount")!.appendChild(this.element);
    },

    stop() {
        // so componenetWillUnMount gets called if Magnifier component is still alive
        ReactDOM.unmountComponentAtNode(this.element!);
        this.element?.remove();
    }
});
