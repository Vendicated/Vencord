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
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { getTheme, insertTextIntoChatInputBox, Theme } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ButtonLooks, ButtonWrapperClasses, Forms, React, TextInput, Tooltip, useState } from "@webpack/common";
import { Channel } from "discord-types/general";

const cl = classNameFactory("vc-seventv-");

interface SevenTVEmote {
    name: string;
    animated: boolean;
    host: SevenTVHost;
}
interface SevenTVHost {
    url: string;
}

let props;
let emotes: SevenTVEmote[] = [];
let searching: boolean = false;
let page: number = 1;
let lastApiCall = 0;
const MINIMUM_API_DELAY = 500;
const API_URL = "https://7tv.io/v3/gql";
let savedvalue = "";

function GetEmoteURL(emote: SevenTVEmote) {
    const extension = emote.animated ? "gif" : "webp";

    return "https:" + emote.host.url + "/" + settings.store.imagesize + "." + extension;
}

async function FetchEmotes(value) {

    const currentTime = Date.now();
    const timeSinceLastCall = currentTime - lastApiCall;
    if (timeSinceLastCall < MINIMUM_API_DELAY)
        return;

    lastApiCall = currentTime;

    searching = true;
    const query = `query SearchEmotes($query: String!, $page: Int, $sort: Sort, $limit: Int, $filter: EmoteSearchFilter) {
        emotes(query: $query, page: $page, sort: $sort, limit: $limit, filter: $filter) {
          items {
            id
            name
            animated
            host {
              url
            }
          }
        }
      }`;

    if (page < 1) page = 1;

    const variables = {
        "query": value,
        "limit": settings.store.limit,
        "page": page,
        "sort": {
            "value": settings.store.sort_value,
            "order": settings.store.sort_order
        },
        "filter": {
            "category": settings.store.category,
            "exact_match": settings.store.exact_match,
            "case_sensitive": settings.store.case_sensitive,
            "ignore_tags": settings.store.ignore_tags,
            "zero_width": settings.store.zero_width,
            "animated": settings.store.animated,
            "aspect_ratio": ""
        }
    };
    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ query, variables })
    }).then(response => response.json())
        .then(data => {
            emotes = data.data.emotes.items;
            searching = false;
            self.SevenTVComponent(props);
        })
        .catch(error => { console.error("[7TVEmotes] " + error); searching = false; });
}


const settings = definePluginSettings({
    exact_match: {
        type: OptionType.BOOLEAN,
        description: "Search only for emotes that have EXACTLY the same name as provided",
        default: true,
    },
    case_sensitive: {
        type: OptionType.BOOLEAN,
        description: "Search only for emotes that have the same casing as provided",
        default: false,
    },
    ignore_tags: {
        type: OptionType.BOOLEAN,
        description: "Ignore emote tags",
        default: false,
    },
    zero_width: {
        type: OptionType.BOOLEAN,
        description: "Search for zero-width emotes (You can't overlap emotes on Discord)",
        default: false,
    },
    animated: {
        type: OptionType.BOOLEAN,
        description: "Search ONLY for animated emotes",
        default: false,
    },
    limit: {
        type: OptionType.NUMBER,
        description: "How many emotes per page?",
        default: 20,
    },
    category: {
        type: OptionType.SELECT,
        description: "In which category to search for emotes?",
        options: [
            { label: "TOP", value: "TOP", default: true },
            { label: "TRENDING", value: "TRENDING_DAY" }
        ],
    },
    sort_value: {
        type: OptionType.SELECT,
        description: "Sort by:",
        options: [
            { label: "Popularity", value: "popularity", default: true },
            { label: "Date Created", value: "date_created" }
        ],
    },
    sort_order: {
        type: OptionType.SELECT,
        description: "",
        options: [
            { label: "Descending", value: "DESCENDING", default: true },
            { label: "Ascending", value: "ASCENDING" }
        ],
    },
    imagesize: {
        type: OptionType.SELECT,
        description: "Default image size:",
        options: [
            { label: "1x", value: "1x", default: true },
            { label: "2x", value: "2x" },
            { label: "3x", value: "3x" },
            { label: "4x", value: "4x" }
        ],
    }
});

export default definePlugin({
    name: "7TV Emotes",
    description: "Search for 7TV Emotes in your Discord Client!",
    authors: [Devs.Xslash],
    dependencies: [],

    patches: [
        {
            find: ".activeCommandOption",
            replacement: {
                match: /(.)\.push.{1,30}disabled:(\i),.{1,20}\},"emoji"\)\)/,
                replace: "$&;try{$2||$1.push($self.chatBarIcon())}catch{}",
            }
        },
        {
            find: ".Messages.EXPRESSION_PICKER_GIF",
            replacement: {
                match: /role:"tablist",.{10,20}\.Messages\.EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL,children:(\[.*?\)\]}\)}\):null,)(.*?closePopout:\w.*?:null)/,
                replace: m => {
                    const stickerTabRegex = /(\w)\?(\(.+?\))\((\w{1,2}),.*?isActive:(\w)==.*?children:(.{1,10}Messages.EXPRESSION_PICKER_STICKER).*?:null/;
                    const res = m.replace(stickerTabRegex, (_m, canUseStickers, jsx, tabHeaderComp, currentTab, stickerText) => {
                        const isActive = `${currentTab}==="7TV"`;
                        return (
                            `${_m},${canUseStickers}?` +
                            `${jsx}(${tabHeaderComp},{id:"seventv-picker-tab","aria-controls":"seventv-picker-tab-panel","aria-selected":${isActive},isActive:${isActive},autoFocus:true,viewType:"7TV",children:${jsx}("div",{children:"7TV"})})` +
                            ":null"
                        );
                    });

                    return res.replace(/:null,((\w)===.*?\.STICKER&&\w\?(\(.*?\)).*?(\{.*?,onSelectSticker:.*?\})\):null)/, (_, _m, currentTab, jsx, props) => {
                        return `:null,${currentTab}==="7TV"?${jsx}($self.SevenTVComponent,${props}):null,${_m}`;
                    });
                }
            }
        },
    ],

    settings,

    start() {
    },

    stop() {
    },

    SevenTVComponent({
        channel,
        closePopout
    }: {
        channel: Channel,
        closePopout: () => void;
    }) {
        const [value, setValue] = useState<string>();

        props = { channel, closePopout };

        if ((value === undefined) && (savedvalue !== "undefined" && savedvalue !== ""))
            setValue(savedvalue);
        savedvalue = value + "";

        return (
            <div className={cl("picker")}>
                <div className={cl("picker-content")}>
                    <div className="seventv-navigation">
                        <TextInput className="seventv-searchinput"
                            type="string"
                            value={value}
                            onChange={e => setValue(e)}
                            placeholder="Emote name..."
                            spellCheck="false"
                            style={{
                                colorScheme: getTheme() === Theme.Light ? "light" : "dark",
                            }}
                        />

                        <Button className="seventv-searchbutton"
                            onClick={() => {
                                if (searching === false) {
                                    page = 1;
                                    FetchEmotes(value);
                                    closePopout();
                                }
                            }}
                        >Search</Button>
                    </div>

                    <br></br>

                    <Forms.FormDivider></Forms.FormDivider>

                    <div className="seventv-emotes">
                        {emotes.map(emote => (
                            <Tooltip text={emote.name}>
                                {({ onMouseEnter, onMouseLeave }) => (
                                    <Button className="seventv-emotebutton"
                                        look="BLANK"
                                        size="ICON"
                                        aria-haspopup="dialog"
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}
                                        datatype="emoji"
                                        onClick={() => {
                                            insertTextIntoChatInputBox(GetEmoteURL(emote));
                                            closePopout();
                                        }}
                                    ><img src={GetEmoteURL(emote)} height="40px"></img></Button>
                                )}
                            </Tooltip>
                        ))}
                    </div>

                    <Forms.FormDivider></Forms.FormDivider>
                    <br></br>

                    <div className="seventv-navigation">
                        <Button className="seventv-pagebutton"
                            onClick={() => {
                                if (searching === false) {
                                    page--;
                                    FetchEmotes(value);
                                }
                            }}
                        >{"<"}</Button>
                        <Button className="seventv-pagebutton"
                            onClick={() => {
                                if (searching === false) {
                                    page++;
                                    FetchEmotes(value);
                                }
                            }}
                        >{">"}</Button>
                    </div>
                </div>

                <div className={cl("footer")}>
                    <Forms.FormText className="seventv-pagetext">Page {page}</Forms.FormText>
                </div>
            </div>
        );
    },

    chatBarIcon() {
        return (
            <Tooltip text="7TV Emotes">
                {({ onMouseEnter, onMouseLeave }) => (
                    <div style={{ display: "flex" }}>
                        <Button
                            aria-haspopup="dialog"
                            aria-label=""
                            size=""
                            look={ButtonLooks.BLANK}
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            innerClassName={ButtonWrapperClasses.button}
                            onClick={() => {
                                self.SevenTVComponent(props);
                            }}
                            className={cl("button")}
                        >
                            <div className={ButtonWrapperClasses.buttonWrapper}>
                                <svg
                                    aria-hidden="true"
                                    role="img"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 109.6 80.9"
                                >
                                    <g fill="none" fill-rule="evenodd">
                                        <path d="M84.1,22.2l5-8.7,2.7-4.6L86.8.2V0H60.1l5,8.7,5,8.7,2.8,4.8H84.1" fill="currentColor"></path>
                                        <path d="M29,80.6l5-8.7,5-8.7,5-8.7,5-8.7,5-8.7,5-8.7L62.7,22l-5-8.7-5-8.7L49.9.1H7.7l-5,8.7L0,13.4l5,8.7v.2h32l-5,8.7-5,8.7-5,8.7-5,8.7-5,8.7L8.5,72l5,8.7v.2H29" fill="currentColor"></path>
                                        <path d="M70.8,80.6H86.1l5-8.7,5-8.7,5-8.7,5-8.7,3.5-6-5-8.7v-.2H89.2l-5,8.7-5,8.7-.7,1.3-5-8.7-5-8.7-.7-1.3-5,8.7-5,8.7L55,53.1l5,8.7,5,8.7,5,8.7.8,1.4" fill="currentColor"></path>
                                    </g>
                                </svg>
                            </div>
                        </Button>
                    </div>
                )
                }
            </Tooltip >
        );
    },
});
