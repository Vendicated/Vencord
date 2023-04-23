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
import { closeAllModals, closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ButtonLooks, ButtonWrapperClasses, Forms, Tooltip, useState } from "@webpack/common";

const cl = classNameFactory("vc-st-");

interface SevenTVEmote {
    name: string;
    animated: boolean;
    host: SevenTVHost;
}
interface SevenTVHost {
    url: string;
}

let modalKey;
let emotes: SevenTVEmote[] = [];
let searching: boolean = false;
let page: number = 1;
let lastApiCall = 0;
const MINIMUM_API_DELAY = 500;
const API_URL = "https://7tv.io/v3/gql";

function GetEmoteURL(emote: SevenTVEmote) {
    const extension = emote.animated ? "gif" : "webp";

    return "https:" + emote.host.url + "/1x." + extension;
}

async function FetchEmotes(value, { rootProps, close }: { rootProps: ModalProps, close(): void; }) {

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

            closeModal(modalKey);
            modalKey = openModal(props => (
                <STVModal
                    rootProps={props}
                    close={() => closeModal(modalKey)}
                />
            ));
        })
        .catch(error => { console.error("[7TVEmotes] " + error); searching = false; });
}

let savedvalue = "";
function STVModal({ rootProps, close }: { rootProps: ModalProps, close(): void; }) {
    const [value, setValue] = useState<string>();

    if ((value === undefined) && (savedvalue !== "undefined" && savedvalue !== ""))
        setValue(savedvalue);
    savedvalue = value + "";

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">
                    7TV Emotes
                </Forms.FormTitle>

                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <div className="seventv-navigation">
                    <input className="seventv-searchinput"
                        type="string"
                        value={value}
                        onChange={e => setValue(e.currentTarget.value)}
                        placeholder="Emote name..."
                        style={{
                            colorScheme: getTheme() === Theme.Light ? "light" : "dark",
                        }}
                    />

                    <Button className="seventv-searchbutton"
                        onClick={() => {
                            if (searching === false) {
                                page = 1;
                                FetchEmotes(value, { rootProps, close });
                            }
                        }}
                    >Search</Button>
                </div>

                <Forms.FormDivider></Forms.FormDivider>

                <div className="seventv-emotes">
                    {emotes.map(emote => (
                        <Tooltip text={emote.name}>
                            {({ onMouseEnter, onMouseLeave }) => (
                                <Button className="seventv-emotebutton"
                                    aria-haspopup="dialog"
                                    onMouseEnter={onMouseEnter}
                                    onMouseLeave={onMouseLeave}
                                    onClick={() => {
                                        insertTextIntoChatInputBox(GetEmoteURL(emote));
                                        closeAllModals();
                                    }}
                                ><img src={GetEmoteURL(emote)} height="24"></img></Button>
                            )}
                        </Tooltip>
                    ))}
                </div>

                <Forms.FormDivider></Forms.FormDivider>

                <div className="seventv-navigation">
                    <Button className="seventv-pagebutton"
                        onClick={() => {
                            if (searching === false) {
                                page--;
                                FetchEmotes(value, { rootProps, close });
                            }
                        }}
                    >{"<"}</Button>
                    <Button className="seventv-pagebutton"
                        onClick={() => {
                            if (searching === false) {
                                page++;
                                FetchEmotes(value, { rootProps, close });
                            }
                        }}
                    >{">"}</Button>
                </div>
            </ModalContent>

            <ModalFooter>
                <Forms.FormText className="seventv-pagetext">Page {page}</Forms.FormText>
            </ModalFooter>
        </ModalRoot>
    );
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
        default: 6,
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
                match: /(.)\.push.{1,30}disabled:(\i),.{1,20}\},"sticker"\)\)/,
                replace: "$&;try{$2||$1.push($self.chatBarIcon())}catch{}",
            }
        },
    ],

    settings,

    start() {
    },

    stop() {
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
                                modalKey = openModal(props => (
                                    <STVModal
                                        rootProps={props}
                                        close={() => closeModal(modalKey)}
                                    />
                                ));
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
