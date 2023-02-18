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
import definePlugin, { OptionType } from "@utils/types";
import { ReactDOM } from "@webpack/common";

import { Magnifer, MagniferProps } from "./components/Magnifer";
import { ELEMENT_ID } from "./constants";


export default definePlugin({
    name: "ImageZoom",
    description: "Lets you zoom in to images and gifs",
    authors: [{
        name: "Syncxv",
        id: 549244932213309442n
    },],
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
                    replace: `$1
                    if(this.props.id === '${ELEMENT_ID}')  {
                        if(!$self.currentMagniferElement) {
                            $self.currentMagniferElement = Vencord.Webpack.Common.React.createElement($self.Magnifer, {size: Vencord.Settings.plugins.ImageZoom.size ?? 100, zoom: Vencord.Settings.plugins.ImageZoom.zoom ?? 2, instance: this});
                            Vencord.Webpack.Common.ReactDOM.render($self.currentMagniferElement, document.querySelector('.magniferContainer'))
                        }
                    };`
                },

                {
                    match: /(componentWillUnmount=function\(\){)/,
                    replace: `$1
                    if($self.currentMagniferElement)  {
                        Vencord.Webpack.Common.ReactDOM.unmountComponentAtNode(document.querySelector('.magniferContainer'))
                        $self.currentMagniferElement = null;
                    };`
                }
            ]
        }
    ],

    settings: definePluginSettings({
        saveZoomValues: {
            type: OptionType.BOOLEAN,
            description: "Weather to save zoom and lens size values",
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
        }
    }),
    // to stop from rendering twice /shrug
    currentMagniferElement: null as React.FunctionComponentElement<MagniferProps & JSX.IntrinsicAttributes> | null,
    element: null as HTMLDivElement | null,

    Magnifer,

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
        this.element.classList.add("magniferContainer");
        document.getElementById("app-mount")!.appendChild(this.element);
    },

    stop() {
        // so componenetWillUnMount gets called if magnifer component is still alive
        ReactDOM.unmountComponentAtNode(document.querySelector(".magniferContainer")!);
        this.element?.remove();
    }
});
