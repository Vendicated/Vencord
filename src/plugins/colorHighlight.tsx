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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Clipboard, Toasts } from "@webpack/common";

function highlightColor(props) {
    if (!props.children) return null;
    const color = props.children.toLowerCase().replace(/,/g, ", ").replace(/\//g, " / ").replace(/\s+/g, " ").replace(/\(\s/g, "(").replace(/\s(\)|,)/g, "$1");

    let colorFr = "";
    let colorBg = "";

    if (color.startsWith("#")) {
        switch (color.length) {
            case 4:
                colorFr = color;
                colorBg = color + "2";
                break;
            case 5:
                colorFr = color.slice(0, 4);
                colorBg = color.slice(0, 4) + "2";
                break;
            case 7:
                colorFr = color;
                colorBg = color + "1A";
                break;
            case 9:
                colorFr = color.slice(0, 7);
                colorBg = color.slice(0, 7) + "1A";
                break;
        }

    } else if (color.startsWith("rgb")) {
        if (color.startsWith("rgba")) {
            colorFr = color.slice(0, color.lastIndexOf(",")) + ",1)";
            colorBg = color.slice(0, color.lastIndexOf(",")) + ",0.1)";
        } else {
            if (color.includes(",")) {
                colorFr = color;
                colorBg = color.slice(0, color.lastIndexOf(")")) + ",0.1)".replace("rgb", "rgba");
            } else if (color.includes("/")) {
                colorFr = color.slice(0, color.lastIndexOf("/")) + ")";
                colorBg = color.slice(0, color.lastIndexOf("/")) + "/0.1)";
            } else {
                colorFr = color;
                colorBg = color.slice(0, color.lastIndexOf(")")) + "/0.1)";
            }
        }

    } else if (color.startsWith("hsl")) {
        if (color.startsWith("hsla")) {
            colorFr = color.slice(0, color.lastIndexOf(",")) + ",1)";
            colorBg = color.slice(0, color.lastIndexOf(",")) + ",0.1)";
        } else {
            if (color.includes(",")) {
                colorFr = color;
                colorBg = color.slice(0, color.lastIndexOf(")")) + ",0.1)".replace("hsl", "hsla");
            } else if (color.includes("/")) {
                colorFr = color.slice(0, color.lastIndexOf("/")) + ")";
                colorBg = color.slice(0, color.lastIndexOf("/")) + "/0.1)";
            } else {
                colorFr = color;
                colorBg = color.slice(0, color.lastIndexOf(")")) + "/0.1)";
            }
        }
    }

    return <span
        className={"vc-color mention interactive"}
        style={{ backgroundColor: colorBg, color: colorFr }}
        onClick={() => {
            Clipboard.copy(color);
            Toasts.show({
                message: "Copied color to clipboard!",
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId(),
                options: {
                    duration: 1000,
                    position: Toasts.Position.BOTTOM
                }
            });
        }}
    >{color}</span>;
}

const INSANE_REGEX = /(#(?:[a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})\b|rgb\(\s*(?:[01]?\d\d?|2[0-4]\d|25[0-5])\s*(?:,|\s)\s*(?:[01]?\d\d?|2[0-4]\d|25[0-5])\s*(?:,|\s)\s*(?:[01]?\d\d?|2[0-4]\d|25[0-5])\s*\)|rgb\(\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*(?:,|\s)\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*(?:,|\s)\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*\)|rgba\(\s*(?:[01]?\d\d?|2[0-4]\d|25[0-5])\s*,\s*(?:[01]?\d\d?|2[0-4]\d|25[0-5])\s*,\s*(?:[01]?\d\d?|2[0-4]\d|25[0-5])\s*,\s*(?:(?:1|0?\.\d+)|(?:[0-9]?\d(?:\.\d+)?|100)%)\s*\)|rgb\(\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*(?:\/\s*(?:(?:1|0?\.\d+)|(?:[0-9]?\d(?:\.\d+)?|100)%)\s*)?\)|rgb\(\s*(?:[01]?\d\d?|2[0-4]\d|25[0-5])\s*(?:[01]?\d\d?|2[0-4]\d|25[0-5])\s*(?:[01]?\d\d?|2[0-4]\d|25[0-5])\s*\/\s*(?:(?:1|0?\.\d+)|(?:[0-9]?\d(?:\.\d+)?|100)%)\s*\)|hsl\(\s*(?:[012]?\d\d?|3[0-5]\d|360)(?:deg)?\s*(?:,|\s)\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*(?:,|\s)\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*\)|hsla\(\s*(?:[012]?\d\d?|3[0-5]\d|360)(?:deg)?\s*,\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*,\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*,\s*(?:(?:1|0?\.\d+)|(?:[0-9]?\d(?:\.\d+)?|100)%)\s*\)|hsl\(\s*(?:[012]?\d\d?|3[0-5]\d|360)(?:deg)?\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*(?:[0-9]?\d(?:\.\d+)?|100)%\s*\/\s*(?:(?:1|0?\.\d+)|(?:[0-9]?\d(?:\.\d+)?|100)%)\s*\))/ig;

export default definePlugin({
    name: "ColorHighlight",
    authors: [Devs.AutumnVN],
    description: "Highlight color code in chat and click to copy them.",
    patches: [{
        find: ".Messages.MESSAGE_EDITED,",
        replacement: {
            match: /var \i,\i,\i=(\i)/,
            replace: "try {if ($1) $1.content = $self.replaceMessageContent($1); } catch {};$&"
        }
    }],
    replaceMessageContent(comp: { content: any[]; }) {
        const final: any[] = [];
        for (let i = 0; i < comp.content.length; i++) {
            const component = comp.content[i];
            if (typeof component.props.children !== "string") {
                final.push(component);
                continue;
            }

            let message = component.props.children;

            while (i + 1 < comp.content.length && typeof comp.content[i + 1].props.children === "string") {
                message += comp.content[i + 1].props.children;
                i++;
            }

            const matches = message.match(INSANE_REGEX);

            let split = message.split(INSANE_REGEX);
            split = split.filter((_, index) => index % 2 === 0);
            split.forEach((str, index) => {
                final.push(str);
                final.push(highlightColor({ children: matches[index] }));
            });
            final.pop();
        }
        return final;
    }
});
