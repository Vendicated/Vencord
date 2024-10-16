/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* backdoor? what backdoor? idk what youre yapping about */

import { ApplicationCommandOptionType, findOption, RequiredMessageOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// place html presets here cause that makes the code more readable
const presets = {
    nyanCat: `<body>
<style>
.rainbow {
background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAmCAYAAAClI5npAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAB8SURBVFhH7ZjBDcAgDAOTrkRnyk5kJ2aiVZUJ4odJlRNSeIJ15oEKyP5WnismDUVvgEJPoA+AOzBjJjkggdkt4PIDByxmkgMS2N0CLvUduGNm4ScwugVk6juwHFOIn4DM9yUg0hLWd8A8Nkn4CdjoFnCp74Avhf6ZyAmIPBObJiKt1Gf6AAAAAElFTkSuQmCC);
height: 44px; width: 100vw; display: block; background-size: 32px; background-repeat: repeat-x; z-index:99000 !important;
color: white; text-align: center; font-size: 32px; padding-top: 4px;
font-family: sans-serif; text-shadow: 1px 1px 0px black, 2px 2px 0px black, 3px 3px 0px black, 4px 4px 0px black;}
.cat { height: 42px; z-index:999999 !important; transform: translateX(16px) translateY(-8px);}
.cat, .rainbow {animation: move-right 30s linear none; image-rendering: pixelated; position:fixed; bottom: 50%; right: 100vw; opacity: 0; }

@keyframes move-right {
from {right:100vw;opacity: 1;}
to {right:-200vw;opacity: 1;}
}
</style>
<span class="rainbow"> %TEXT% </span>
<img class="cat" src="<https://www.nyan.cat/cats/original.gif>" draggable="false">
</body>`,
    emojiGift: `<body>
<style>
* {user-select:none}
span {font-size: 64px; position: absolute;}
.gift {cursor:help;transition-duration:0.5s}
.gift:active{opacity:0;cursor:none;transform:scale(2)}
.surprise{transform:scale(0.5) translateX(-8px)}
</style><br><span class="surprise">%TEXT%</span><span class="gift">\\🎁</span><br><br><br></body>`,
    maxwell: `<body>
<style>
.spin { margin-left: 128px; margin-top: 128px; animation: spin 1s ease-in-out infinite; width: 128px;}
@keyframes spin {
0% {transform: rotate(0deg);}
25% {transform: rotate(-45deg) translateY(-64px);}
50% {transform: rotate(0deg);}
75% {transform: rotate(45deg) translateY(-32px) translateX(-24px);}
100% {transform: rotate(0deg);}
}
</style><img class="spin" src="https://jaegerwalddev.github.io/assets/static/my_first_website-2/images/maxwell_transparent.webp" draggable="false"></body>`,
    yaris: `<img src="<https://www.fortunacarmats.com/cache/goods/700x700x61ea817c40dc5.png>" class="yaris" draggable="false"/>
<style>.yaris { animation: bounce 0.22222222222s infinite alternate cubic-bezier(.9,0,.1,1); }
@keyframes bounce { 0% { transform: translateY(0) scale(1, 1); } 100% { transform: translateY(calc(20%)) scale(1.3, 0.7); } }</style>`,
    thoughts: `<img src="<https://jaegerwalddev.github.io/assets/images/thoughts.png>" style="position: absolute; display: block; bottom: %TEXT%px; left: 64px;"></img>dawg i can see your thoughts`
};

function html(htmlText: string) {
    return `[[${htmlText}]]`;
}
function htmlPlaceholder(htmlText: string, replacement: string) {
    return `[[${htmlText.replace("%TEXT%", replacement)}]]`;
}
function htmlPlaceholders(htmlText: string, replacements: string[]) {
    const result = `[[${htmlText}]]`;
    for (let i = 0; i < replacements.length; i++) {
        result.replace(`%TEXT${i + 1}%`, replacements[i]);
    }
    return result;
}

// burn this function while you still have the chance
function getLatestMessage() {
    const messageList = document.querySelectorAll(".messageListItem_d5deea");
    return messageList[messageList.length - 1];
}
function emojiToImg(id: string) {
    return `imagine getting a normal respons :3 ${id}`;
}

export default definePlugin({
    name: "HtmlMarkdownCommands",
    description: "Adds a couple of presets (as slash commands) for MoreMarkdown's HTML feature.",
    authors: [Devs.Jaegerwald],
    commands: [
        {
            name: "nyan-cat",
            description: "Makes a Nyan Cat banner that flies across the screen.",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: htmlPlaceholder(presets.nyanCat, findOption(opts, "message", ""))
            })
        },
        {
            name: "emoji-gift",
            description: "Sends a clickable gift, that reveals an emoji inside.",
            options: [
                {
                    name: "emoji",
                    description: "OS-native emoji (prepend \"\\\"), Discord emojis will not work.",
                    type: ApplicationCommandOptionType.STRING
                }
            ],
            execute: opts => ({
                content: htmlPlaceholder(presets.emojiGift, findOption(opts, "emoji", ""))
            })
        },
        {
            name: "maxwell",
            description: "Makes Maxwell appear as a message.",
            execute: () => ({
                content: html(presets.maxwell)
            })
        },
        {
            name: "toyota-yaris",
            description: "Bouncing Toyota Yaris.",
            execute: () => ({
                content: html(presets.yaris)
            })
        },
        {
            name: "thoughts",
            description: "Generate a thought bubble over the previous message (adjust the values after sending as needed.)",
            execute: () => ({
                content: htmlPlaceholder(presets.thoughts, (getLatestMessage()?.getBoundingClientRect().height + 96).toString())
            })
        },
        {
            name: "html-emoji-dbg",
            description: "Test out getting the emoji source",
            options: [RequiredMessageOption],
            devOnly: true,
            execute: opts => ({
                content: emojiToImg(findOption(opts, "emoji", ""))
            })
        }
    ]
});
