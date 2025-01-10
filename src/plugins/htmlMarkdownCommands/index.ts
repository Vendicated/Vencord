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
.spin {margin-left: 128px; margin-top: 128px; animation: spin 1s ease-in-out infinite; width: 128px;}
@keyframes spin {
0% {transform: rotate(0deg);}
25% {transform: rotate(-45deg) translateY(-64px);}
50% {transform: rotate(0deg);}
75% {transform: rotate(45deg) translateY(-32px) translateX(-24px);}
100% {transform: rotate(0deg);}
}
</style><img class="spin" src="<https://jaegerwalddev.github.io/assets/static/school/my_first_website-2/images/maxwell_transparent.webp>" draggable="false"></body>`,
    yaris: `<img src="<https://www.fortunacarmats.com/cache/goods/700x700x61ea817c40dc5.png>" class="yaris" draggable="false"/>
<style>.yaris { animation: bounce 0.22222222222s infinite alternate cubic-bezier(.9,0,.1,1); }
@keyframes bounce { 0% { transform: translateY(0) scale(1, 1); } 100% { transform: translateY(calc(20%)) scale(1.3, 0.7); } }</style>`,
    thoughts: `<img src="<https://jaegerwalddev.github.io/assets/images/thoughts.png>" style="position: absolute; display: block; bottom: %TEXT%px; left: 64px;"></img>dawg i can see your thoughts`,
    gnarpy: `<body><style>
.boing {margin-bottom: 256px; margin-left: 128px; transform: translateY(64px); animation: boing 1s ease-in-out infinite; width: 64px;}
.boing-shadow {position: absolute; display: block; background-color: black; border-radius: 50%; opacity: 0.5; filter: blur(8px);
width: 128px; height: 32px; margin-left: 96px; transform: translateY(-48px) translateZ(48px); animation: boing-shadow 1s ease-in-out infinite; z-index: -1;}
@keyframes boing {
0% {transform: translateY(256px) scaleX(2) scaleY(0.5);}
40% {transform: translateY(0px) scaleX(1) scaleY(1.5);}
100% {transform: translateY(256px) scaleX(2) scaleY(0.5);}
}
@keyframes boing-shadow {
0% {opacity: 0.5; filter: blur(8px);}
40% {opacity: 0.25; filter: blur(16px);}
100% {opacity: 0.5; filter: blur(8px);}
}
</style>
<img class="boing" src="https://jaegerwalddev.github.io/assets/static/school/my_first_website-2/images/gnarpy_cat.png">
<span class="boing-shadow"></span></body>`,
    nyanRevolve: `@@[[<img src="<https://www.nyan.cat/cats/original.gif>" style="display:block;position:fixed;height:64px;bottom:256px;"/>]]@@ %TEXT%`,
    approach: `<body><style>@keyframes scaleAnim{0%{transform:perspective(500px) scale(0);}100%{transform:perspective(500px) scale(1);}}img{width:500px;height:auto;transform-origin:center;animation:scaleAnim 10s cubic-bezier(0.32, 0, 0.67, 0) infinite;}</style><img src="<%TEXT%>"></body>`
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

function placeholder(text: string, replacement: string) {
    return `${text.replace("%TEXT%", replacement)}`;
}
function placeholders(text: string, replacements: string[]) {
    const result = `${text}`;
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
    return `> **Emoji Debug**
> Source: ${id}
> ID?: *N/A*
> Name?: ${id.replace(">", "").split(":")[1]}
> -# Not fully working yet, whoops`;
}

export default definePlugin({
    name: "HtmlMarkdownCommands",
    description: "Adds a couple of presets (as slash commands) for MoreMarkdown's HTML feature.",
    nexulien: true,
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
            name: "gnarpy",
            description: "Makes a bouncing Gnarpy Cat appear as a message.",
            execute: () => ({
                content: html(presets.gnarpy)
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
            name: "revolving-nyan-cat",
            description: "Makes Nyan Cat revolve around your message.",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: placeholder(presets.nyanRevolve, findOption(opts, "message", ""))
            })
        },
        {
            name: "approaching-image",
            description: "Makes an image approach. Run.",
            options: [
                {
                    name: "image-url",
                    description: "A link (ex: https://example.com/image.png) to an image.",
                    type: ApplicationCommandOptionType.STRING
                }
            ],
            execute: opts => ({
                content: htmlPlaceholder(presets.approach, findOption(opts, "image-url", ""))
            })
        },
        {
            name: "html-emoji-dbg",
            description: "Test out getting the emoji source",
            options: [
                {
                    name: "emoji",
                    description: "Emoji for testing (non-Tweemoji)",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            devOnly: true,
            execute: opts => ({
                content: emojiToImg(findOption(opts, "emoji", ""))
            })
        }
    ]
});
