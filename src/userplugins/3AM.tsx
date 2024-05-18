/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Forms, Toasts } from "@webpack/common";
const ColorPicker = findComponentByCodeLazy(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)");

const settings = definePluginSettings({
    serverListAnim: {
        type: OptionType.BOOLEAN,
        description: "Toggles if the server list hides when not hovered",
        default: false,
        onChange: () => injectCSS()
    },
    memberListAnim: {
        type: OptionType.BOOLEAN,
        description: "Toggles if the member list hides when not hovered",
        default: true,
        onChange: () => injectCSS()
    },
    privacyBlur: {
        type: OptionType.BOOLEAN,
        description: "Blurs potentially sensitive information when not tabbed in",
        default: false,
        onChange: () => injectCSS()
    },
    customHomeIcon: {
        type: OptionType.BOOLEAN,
        description: "If the discord home icon gets replaced with the 3AM Moon",
        default: true,
        onChange: () => injectCSS()
    },
    flashBang: {
        type: OptionType.BOOLEAN,
        description: "you dont wanna know",
        default: false,
        onChange: () => injectCSS()
    },
    customFont: {
        type: OptionType.STRING,
        description: "The @import for a custom font (blank to disable)",
        default: "",
        onChange: () => injectCSS()
    },
    animationSpeed: {
        type: OptionType.STRING,
        description: "The speed of animations",
        default: "0.2",
        onChange: () => injectCSS()
    },
    toasts: {
        type: OptionType.BOOLEAN,
        description: "If the vencordtoolbox options use toasts. Warning: they take a while to disappear",
        default: false
    },
    Primary: {
        type: OptionType.COMPONENT,
        description: "",
        default: "000000",
        component: () => <ColorPick propertyname="Primary" />
    },
    Accent: {
        type: OptionType.COMPONENT,
        description: "",
        default: "313338",
        component: () => <ColorPick propertyname="Accent" />
    },
    Text: {
        type: OptionType.COMPONENT,
        description: "",
        default: "ffffff",
        component: () => <ColorPick propertyname="Text" />
    },
});


export function ColorPick({ propertyname }: { propertyname: string; }) {
    return (

        <div className="color-options-container">
            <Forms.FormTitle tag="h3">{propertyname}</Forms.FormTitle>

            <ColorPicker
                color={parseInt(settings.store[propertyname], 16)}
                onChange={color => {
                    const hexColor = color.toString(16).padStart(6, "0");
                    settings.store[propertyname] = hexColor;
                    injectCSS();
                }
                }
                showEyeDropper={false}
            />
        </div>
    );
}
function injectCSS() {
    const fontRegex = /family=([^&;,:]+)/;
    const customFontString: string = Settings.plugins.ThreeAM.customFont;
    const fontNameMatch: RegExpExecArray | null = fontRegex.exec(customFontString);
    const fontName = fontNameMatch ? fontNameMatch[1].replace(/[^a-zA-Z0-9]+/g, " ") : "";

    console.log("3AM Font name: " + fontName);
    console.log("3AM Font import: " + Settings.plugins.ThreeAM.customFont);
    console.log("3AM Animation speed: " + Settings.plugins.ThreeAM.animationSpeed);

    // for your sanity, just, fucking, collapse this
    const theCSS = `
                /* IMPORTS */

                /* Fonts */
                @import url('https://fonts.googleapis.com/css2?family=Nunito&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Fira+Code&display=swap');
                ${Settings.plugins.ThreeAM.customFont}

        /*Settings things*/
            /*flashbang*/
            ${Settings.plugins.ThreeAM.flashBang ? `
            html
                {
                    filter: invert(1);}
            ` : ""}
            /*Server list animation*/
            ${Settings.plugins.ThreeAM.serverListAnim ? `
            .guilds__2b93a {
                width: 10px;
                transition: width var(--animspeed) ease 0.1s, opacity var(--animspeed) ease 0.1s;
                opacity: 0;
            }
            .guilds__2b93a:hover {
                width: 65px;
                opacity: 100;
            }
            ` : ""}
            /*Member list anim toggle*/
            ${Settings.plugins.ThreeAM.memberListAnim ? `
                .container_b2ce9c
                {
                    width: 60px;
                    opacity: 0.2;
                    transition: width var(--animspeed) ease 0.1s, opacity var(--animspeed) ease 0.1s;

                }
                .container_b2ce9c:hover
                {
                    width: 250px;
                    opacity: 1;
                }
            ` : ""}
            /*Privacy blur*/
            ${Settings.plugins.ThreeAM.privacyBlur ? `
                    .header__39b23,
                    .container__590e2,
                    .title_b7d661,
                    .layout__59abc,
                    [aria-label="Members"] {
                    filter: blur(0);
                    transition: filter 0.2s ease-in-out;
                    }

                    body:not(:hover) .header__39b23,
                    body:not(:hover) .container__590e2,
                    body:not(:hover) .title_b7d661,
                    body:not(:hover) [aria-label="Members"],
                    body:not(:hover) .layout__59abc {
                    filter: blur(5px);
                    }
            ` : ""}
            /*Custom home icon*/
            ${Settings.plugins.ThreeAM.customHomeIcon ? `
            [aria-label="Direct Messages"] .childWrapper__01b9c
            {
                content: url(https://github.com/cheesesamwich/3AM/blob/main/icon.png?raw=true);
            }
        ` : ""}
            /*Root configs*/
            :root
            {
                --animspeed: ${Settings.plugins.ThreeAM.animationSpeed + "s"};
                --font-primary: ${(fontName.length > 0 ? fontName : "Nunito")}
            }
        :root
        {

            /*VARIABLES*/

                /*editable variables. Feel free to mess around with these to your hearts content, i recommend not editing the logic variables unless you have an understanding of css*/

                --accent: #${Settings.plugins.ThreeAM.Accent};
                --bgcol: #${Settings.plugins.ThreeAM.Primary};
                --glowcol: rgb(51, 51, 51);
                --mentioncol: rgb(0, 0, 0);
                --mentionhighlightcol: rgb(0, 0, 0);
                --linkcol: rgb(95, 231, 255);
                --highlightcol: rgb(95, 231, 255);
                --text: #${Settings.plugins.ThreeAM.Text};


            /*COLOR ASSIGNING  (most of these probably effect more than whats commented)*/

                /*accent based*/

                    /*buttons*/
                    --button-secondary-background: var(--accent);

                    /*also buttons*/
                    --brand-experiment: var(--accent);

                    /*message bar*/
                    --channeltextarea-background: var(--accent);

                    /*selected dm background*/
                    --background-modifier-selected: var(--accent);

                    /*emoji autofill*/
                    --primary-630: var(--accent);

                    /*plugin grid square and nitro shop*/
                    --background-secondary-alt: var(--accent);

                    /*modal background, self explanatory*/
                    --modal-background: var(--accent);

                    /*color of the background of mention text*/
                    --mention-background: var(--accent);
                    --input-background: var(--accent);


                /*background based*/

                    /*primary color, self explanatory*/
                    --background-primary: var(--bgcol);

                    /*dm list*/
                    --background-secondary: var(--bgcol);

                    /*outer frame and search background*/
                    --background-tertiary: var(--bgcol);


                    /*friends header bar*/
                    --bg-overlay-2: var(--bgcol);

                    /*user panel*/
                    --bg-overlay-1: var(--bgcol);

                    /*vc panel thing*/
                    --background-secondary-alt: var(--bgcol);

                    /*call thingy*/
                    --bg-overlay-app-frame: var(--bgcol);

                    /*shop*/
                    --background-floating: var(--bgcol);
                    --background-mentioned-hover: var(--bgcol) !important;
                    --background-mentioned: var(--bgcol) !important;




                /*other*/

                    /*mention side line color color*/
                    --info-warning-foreground: var(--mentionhighlightcol);

                    /*text color of mention text*/
                    --mention-foreground: white;

                    /*Link color*/
                    --text-link: var(--linkcol);
                    --header-primary: var(--text);
                    --header-secondary: var(--text);
                    --font-display: var(--text);
                    --text-normal: var(--text);
                    --interactive-normal: var(--text);
                    --white-500: var(--text);
        }


                /*EXTRA COLORS*/

                        /*sorry, forgot to document what these are when i was adding them*/
                        .inspector__993e1, .scroller_e89578, .unicodeShortcut__1dd6b
                        {
                            background-color: var(--bgcol);
                        }
                        .inner__178b2
                        {
                            background-color: var(--accent);
                        }
                        /*recolor embeds*/
                        [class^="embedWrap"]
                        {
                            border-color: var(--accent) !important;
                            background: var(--accent);
                        }
                        /*emoji menu recolor*/
                        .contentWrapper__321ed, .header_c3c744
                        {
                        background-color: var(--bgcol);
                        }
                        /*vc background recolor*/
                        .root__3eef0
                        {
                            background-color: var(--bgcol);
                        }



                        /*Set the bg color*/
                        .container_b181b6
                        {
                            background-color: var(--bgcol);
                        }
                        /*Recolor the posts to the accent*/
                        .container__99b06
                        {
                            background-color: var(--accent);
                        }

                        /*Recolor the background of stickers in the sticker picker that dont take up the full 1:1 ratio*/
                        [id^="sticker-picker-grid"]
                        {
                            background-color: var(--bgcol);
                        }
                        /* profile sidebar*/
                        [class="none__51a8f scrollerBase_dc3aa9"]
                        {
                            background-color: var(--bgcol) !important;
                        }
                        /*Recolor the emoji, gif, and sticker picker selected button*/
                        .navButtonActive__735cb, .stickerCategoryGenericSelected__44ec4, .categoryItemDefaultCategorySelected__8245a
                        {
                            background-color: var(--accent) !important;
                        }
                /*ROUNDING (rounding)*/

                        /*round message bar, some buttons, dm list button, new messages notif bar, channel buttons, emoji menu search bar, context menus, account connections(in that order)*/
                        .scrollableContainer__33e06, .button_afdfd9, .interactive__776ee, .newMessagesBar__8b6d7, .link__95dc0, .searchBar__8f956, .menu_dc52c6, .connectedAccountContainer__23f00
                        {
                            border-radius: 25px;
                        }
                        /*round emojis seperately (and spotify activity icons)*/
                        [data-type="emoji"], [class*="Spotify"]
                        {
                            border-radius: 5px;
                        }
                        /*round gifs and stickers (and maybe images idk lmao), and embeds*/
                        [class^="imageWr"], [data-type="sticker"], [class^="embed"]
                        {
                            border-radius: 20px;
                        }

                        .item__183e8
                        {
                          border-radius: 15px;
                        }



                        /*slightly move messages right when hovered*/
                        .cozyMessage__64ce7
                        {
                            left: 0px;

                            transition-duration: 0.2s;
                        }
                        .cozyMessage__64ce7:hover
                        {
                            left: 3px;
                        }



                /*CONTENT (Typically changing values or hiding elements)*/

                        /*Hide most of the ugly useless scrollbars*/
                        ::-webkit-scrollbar
                        {
                            display:none;
                        }


                        /*Hide user profile button, the dm favourite, dm close, support, gift buttons, the now playing column, and the channel + favourite icons*/
                        [aria-label="Hide User Profile"], .favoriteIcon_b001ac, .closeButton__8f1fd, [href="https://support.discord.com"], .nowPlayingColumn-1eCBCN, button[aria-label="Send a gift"], .icon_eff5d4, .iconContainer__3f9b0
                        {
                            display :none;
                        }

                        /*yeet the shitty nitro and family link tabs that no one likes*/
                        .channel_c21703[aria-posinset="2"],
                        .familyCenterLinkButton__893e2
                        {
                            display: none;

                        }
                        /*Remove the buttons at the bottom of the user pop out (seriously, who wanted this?)*/
                        .addFriendSection__413d3
                        {
                            display: none;
                        }

                        /*No more useless spotify activity header*/
                        .headerContainer__2ec4e
                        {
                            display: none;
                        }
                        /*hide sidebar connections*/
                        .profilePanelConnections__3c232
                        {
                          display: none;
                        }
                        /*pad the message bar right slightly. Not sure what caused the buttons to flow out of it, might be something in the theme :shrug:*/
                        .inner__9fd0b
                        {
                            padding-right: 10px;
                        }

                        /*Yeet hypesquad badges (who cares)*/
                        [aria-label*="HypeSquad"]
                        {
                            display: none !important;
                        }

                        /*Hide icon on file uploading status*/
                        .icon__30aa7
                        {
                            display: none;
                        }

                        /*hide the play button while a soundmoji is playing*/
                        .playing_c91456 [viewBox="0 0 24 24"]
                        {
                            display:none;
                        }
                        /*hide the public servers button on member list*/
                        [aria-label="Explore Discoverable Servers"]
                        {
                            display: none;
                        }
                        /*fix context menu being not symmetrical*/
                        .scroller__750f5
                        {
                            padding: 6px 8px !important;
                        }
                        /*Hide the icon that displays what platform the user is listening with on spotify status*/
                        .platformIcon__05c5e
                        {
                            display: none !important;
                        }
                        /*hide the album name on spotify statuses (who cares)*/
                        [class="state_a85ac0 ellipsis__427eb textRow__4750e"]
                        {
                            display: none;
                        }
                        /*space the connections a bit better*/
                        .userInfoSection__1daf8
                        {
                            margin-bottom: 0px;
                            padding-bottom: 0px;
                        }
                        /*Space channels*/
                        .containerDefault__3187b
                        {
                        padding-top: 5px;
                        }

                        /*round banners in profile popout*/
                        .banner__6d414:not(.panelBanner__90b8a)
                        {
                          border-radius: 20px;
                        }
                        /*round the user popout*/
                        .userPopoutOuter_d739b2
                        {
                          border-radius: 25px;
                        }
                        /*round the inner profile popout*/
                        [class="userPopoutInner_f545a3 userProfileInner__8065b userProfileInnerThemedWithBanner_d5f991"]::before
                        {
                        border-radius: 20px;
                        }

                /*STYLING (Modification of content to fit the theme)*/

                        /*Round and scale down the users banner*/
                        .panelBanner__90b8a
                        {
                        border-radius: 20px;
                        transform: scale(0.95);
                        }
                        /*add a soft glow to message bar contents, user panel, dms, channel names (in that order)*/
                        .inner__9fd0b .layout__59abc, .name__8d1ec
                        {
                        filter: drop-shadow(0px 0px 3px var(--glowcol));
                        }
                        [type="button"]
                        {
                                transition: all 0.1s ease-in-out;
                        }
                        [type="button"]:hover
                        {
                                filter: drop-shadow(0px 0px 3px var(--glowcol));
                        }

                        /*Change the font*/
                        :root
                        {
                            --font-code: "Fira Code";
                        }

                        /*Round all status symbols. basically does what that one plugin does but easier (disabled because of a bug)
                        .pointerEvents__33f6a
                        {
                            mask: url(#svg-mask-status-online);
                        }
                        */

                        /*all this is maxwell loading screen*/
                        .ready__61f2f
                        {
                            scale: 0;
                        }

                        .content__0e954::after
                        {
                            content: url(https://media.tenor.com/gexfZzl4ZRsAAAAi/maxwell-cat.gif);
                            position: relative;
                            display: inline-block;
                            top: -425px;
                            left: 100px;
                            zoom: 0.5;
                        }

                        .tipTitle_a7615c
                        {
                            text-transform: none;
                            font-size: 0px;
                            font-weight: 200
                        }

                        .tipTitle_a7615c::after
                        {
                            content: "Loading 3AM";
                            font-size: 18px
                        }

                        .tip__6e299
                        {
                            text-transform: none;
                            font-size: 0px;
                            font-weight: 500
                        }

                        .tip__6e299::after
                        {
                            content: "While you wait, heres maxwell!";
                            font-size: 15px
                        }

                        /*pfp uploader crosshair*/
                        .overlayAvatar__7ca47
                        {
                        background-image: url(https://raw.githubusercontent.com/cheesesamwich/3AM/main/crosshair.png);
                        background-repeat: no-repeat;
                        background-position-x: 50%;
                        background-position-y: 50%;
                        border-width: 2px;
                        }

                        /*change highlighted text color*/
                        ::selection
                        {
                            color: inherit;
                            background-color: transparent;
                            text-shadow: 0px 0px 3px var(--highlightcol);
                        }
                        /*hide the line between connections and note*/
                        [class="connectedAccounts_dc0a56 userInfoSection__1daf8"]
                        {
                            border-top: transparent !important;
                        }
        `;
    var elementToRemove = document.getElementById("3AMStyleInjection");
    if (elementToRemove) {
        elementToRemove.remove();
    }
    const styleElement = document.createElement("style");
    styleElement.id = "3AMStyleInjection";
    styleElement.textContent = theCSS;
    document.documentElement.appendChild(styleElement);
    console.log("Loaded css, oldElement: " + elementToRemove != null);
}
export default definePlugin({
    name: "ThreeAM",
    description: "Its 3AM. No Light, Just Night.",
    authors: [
        {
            id: 976176454511509554n,
            name: "cheesesamwich",
        },
    ],
    settings,

    patches: [],

    // this functions formatting looks weird. i dont fucking know honestly
    start() {
        injectCSS();
    },
    stop() {
        const injectedStyle = document.getElementById("3AMStyleInjection");
        if (injectedStyle) {
            injectedStyle.remove();
        }
    },




    toolboxActions: {
        async "Server Anim Toggle"() {
            if (Settings.plugins.ThreeAM.toasts) {
                Toasts.show({
                    id: Toasts.genId(),
                    message: "Changed server anim to " + !Settings.plugins.ThreeAM.serverListAnim,
                    type: Toasts.Type.SUCCESS
                });
            }
            Settings.plugins.ThreeAM.serverListAnim = !Settings.plugins.ThreeAM.serverListAnim;
            injectCSS();
        },
        async "Member Anim Toggle"() {
            if (Settings.plugins.ThreeAM.toasts) {
                Toasts.show({
                    id: Toasts.genId(),
                    message: "Changed member anim to " + !Settings.plugins.ThreeAM.memberListAnim,
                    type: Toasts.Type.SUCCESS
                });
            }
            Settings.plugins.ThreeAM.memberListAnim = !Settings.plugins.ThreeAM.memberListAnim;
            injectCSS();
        },
        async "Privacy Blur Toggle"() {
            if (Settings.plugins.ThreeAM.toasts) {
                Toasts.show({
                    id: Toasts.genId(),
                    message: "Changed privacy blur to " + !Settings.plugins.ThreeAM.privacyBlur,
                    type: Toasts.Type.SUCCESS
                });
            }

            Settings.plugins.ThreeAM.privacyBlur = !Settings.plugins.ThreeAM.privacyBlur;
            injectCSS();
        },
        async "Home Icon Toggle"() {
            if (Settings.plugins.ThreeAM.toasts) {
                Toasts.show({
                    id: Toasts.genId(),
                    message: "Changed custom home icon to " + !Settings.plugins.ThreeAM.customHomeIcon,
                    type: Toasts.Type.SUCCESS
                });
            }
            Settings.plugins.ThreeAM.customHomeIcon = !Settings.plugins.ThreeAM.customHomeIcon;
            injectCSS();
        }
    }

});
