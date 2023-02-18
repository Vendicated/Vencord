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

import definePlugin from "@utils/types";

import { Magnifer, MagniferProps } from "./components/Magnifer";


export default definePlugin({
    name: "ImageUtility",
    description: "hey",
    authors: [{
        name: "Syncxv",
        id: 549244932213309442n
    },],
    patches: [
        {
            find: "OPEN_IN_BROWSER",
            replacement: {
                match: /(return\(.{1,100}\(\)\.wrapper.{1,100})(src)/,
                replace: "$1id: 'bruhjuhhh',$2"
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
                    onMouseMove: () => $self.onMouseMove(this),
                    id: this.props.id,
                    onMouseEnter:`

                },

                {
                    match: /(componentDidMount=function\(\){)/,
                    replace: `$1
                    if(this.props.id === 'bruhjuhhh')  {
                        $self.what = Vencord.Webpack.Common.React.createElement($self.Magnifer, {size: 100, zoom: 2, instance: this});
                        Vencord.Webpack.Common.ReactDOM.render($self.what, document.querySelector('.magniferContainer'))
                    };`
                },

                {
                    match: /(componentWillUnmount=function\(\){)/,
                    replace: `$1
                    if($self.what)  {
                        Vencord.Webpack.Common.ReactDOM.unmountComponentAtNode(document.querySelector('.magniferContainer'))
                    };`
                }
            ]
        }
    ],

    what: null as React.FunctionComponentElement<MagniferProps & JSX.IntrinsicAttributes> | null,

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
    onMouseMove(instance) {
        if (instance.state.mouseOver && instance.state.mouseDown)
            // console.log(instance.state, "HI start rendring zoom");
            return;
    },

    start() {
        this.element = document.createElement("div");
        this.element.classList.add("magniferContainer");
        document.getElementById("app-mount")!.appendChild(this.element);
    },

    stop() {
        document.querySelector(".magniferContainer")?.remove();
    }
});
