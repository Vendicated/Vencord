/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Button, Clipboard, Forms, TextInput, Toasts, useState } from "@webpack/common";

import { darkenColorHex, generateRandomColorHex, saturateColorHex } from "./generateTheme";
import { themes } from "./themeDefinitions";

export interface ThemePreset {
    bgcol: string;
    accentcol: string;
    textcol: string;
    brand: string;
    name: string;
}

let setPreset;


function LoadPreset(preset?: ThemePreset) {
    if (setPreset === settings.store.ColorPreset) { return; }
    const theme: ThemePreset = preset == null ? themes[settings.store.ColorPreset] : preset;
    setPreset = settings.store.ColorPreset;
    settings.store.Primary = theme.bgcol;
    settings.store.Accent = theme.accentcol;
    settings.store.Text = theme.textcol;
    settings.store.Brand = theme.brand;
    injectCSS();
}

function mute(hex, amount) {
    hex = hex.replace(/^#/, "");
    const bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    r = Math.max(r - amount, 0);
    g = Math.max(g - amount, 0);
    b = Math.max(b - amount, 0);
    return "#" + ((r << 16) + (g << 8) + b).toString(16).padStart(6, "0");
}

function copyPreset(name: string) {
    const template =
        `
{
    bgcol: "${settings.store.Primary}",
    accentcol: "${settings.store.Accent}",
    textcol: "${settings.store.Text}",
    brand: "${settings.store.Brand}",
    name: "${name}"
}
    `;
    if (Clipboard.SUPPORTS_COPY) {
        Clipboard.copy(template);
    }

}

function CopyPresetComponent() {

    const [inputtedName, setInputtedName] = useState("");
    return (
        <>
            <Forms.FormSection>
                <Forms.FormTitle>{"Preset name"}</Forms.FormTitle>
                <TextInput
                    type="text"
                    value={inputtedName}
                    onChange={setInputtedName}
                    placeholder={"Enter a name"}
                />
            </Forms.FormSection>
            <Button onClick={() => {
                copyPreset(inputtedName);
            }}>Copy preset</Button>
            <Button onClick={() => {
                generateAndApplyProceduralTheme();
            }}>Generate Random</Button>
        </>
    );
}

const ColorPicker = findComponentByCodeLazy(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)");

export function generateAndApplyProceduralTheme() {

    const randomBackgroundColor = generateRandomColorHex();
    const accentColor = darkenColorHex(randomBackgroundColor);
    const textColor = "ddd0d0";
    const brandColor = saturateColorHex(randomBackgroundColor);

    settings.store.Primary = randomBackgroundColor;
    settings.store.Accent = accentColor;
    settings.store.Text = textColor;
    settings.store.Brand = brandColor;

    injectCSS();
}

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
    tooltips: {
        type: OptionType.BOOLEAN,
        description: "If tooltips are displayed in the client",
        default: false,
        onChange: () => injectCSS()
    },
    customFont: {
        type: OptionType.STRING,
        description: "The google fonts @import for a custom font (blank to disable)",
        default: "@import url('https://fonts.googleapis.com/css2?family=Poppins&wght@500&display=swap');",
        onChange: injectCSS
    },
    animationSpeed: {
        type: OptionType.STRING,
        description: "The speed of animations",
        default: "0.2",
        onChange: injectCSS
    },
    ColorPreset: {
        type: OptionType.SELECT,
        description: "Some pre-made color presets (more soon hopefully)",
        options: themes.map(theme => ({ label: theme.name, value: themes.indexOf(theme), default: themes.indexOf(theme) === 0 })),
        onChange: () => { LoadPreset(); }
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
    Brand: {
        type: OptionType.COMPONENT,
        description: "",
        default: "ffffff",
        component: () => <ColorPick propertyname="Brand" />
    },
    pastelStatuses: {
        type: OptionType.BOOLEAN,
        description: "Changes the status colors to be more pastel (fits with the catppuccin presets)",
        default: true,
        onChange: () => injectCSS()
    },
    DevTools:
    {
        type: OptionType.COMPONENT,
        description: "meow",
        default: "",
        component: () => <CopyPresetComponent />
    },
    ExportTheme:
    {
        type: OptionType.COMPONENT,
        description: "",
        default: "",
        component: () => <Button onClick={() => {
            copyCSS();
            Toasts.show({
                id: Toasts.genId(),
                message: "Successfully copied theme!",
                type: Toasts.Type.SUCCESS
            });
        }} >Copy The CSS for your current configuration.</Button>
    }
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


function copyCSS() {
    if (Clipboard.SUPPORTS_COPY) {
        Clipboard.copy(getCSS(parseFontContent()));
    }
}

function parseFontContent() {
    const fontRegex = /family=([^&;,:]+)/;
    const customFontString: string = Settings.plugins.Glide.customFont;
    if (customFontString == null) { return; }
    const fontNameMatch: RegExpExecArray | null = fontRegex.exec(customFontString);
    const fontName = fontNameMatch ? fontNameMatch[1].replace(/[^a-zA-Z0-9]+/g, " ") : "";
    return fontName;
}
function injectCSS() {

    const fontName = parseFontContent();
    const theCSS = getCSS(fontName);

    var elementToRemove = document.getElementById("GlideStyleInjection");
    if (elementToRemove) {
        elementToRemove.remove();
    }
    const styleElement = document.createElement("style");
    styleElement.id = "GlideStyleInjection";
    styleElement.textContent = theCSS;
    document.documentElement.appendChild(styleElement);
}

function getCSS(fontName) {
    return `
        /* IMPORTS */

        /* Fonts */
        @import url('https://fonts.googleapis.com/css2?family=Nunito&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code&display=swap');
        ${Settings.plugins.Glide.customFont}

    /*Settings things*/
        /*Server list animation*/
        ${Settings.plugins.Glide.serverListAnim ? `
        .guilds_a4d4d9 {
            width: 10px;
            transition: width var(--animspeed) ease 0.1s, opacity var(--animspeed) ease 0.1s;
            opacity: 0;
        }
        .guilds_a4d4d9:hover {
            width: 65px;
            opacity: 100;
        }
        ` : ""}
        /*Member list anim toggle*/
        ${Settings.plugins.Glide.memberListAnim ? `
            .container_cbd271
            {
                width: 60px;
                opacity: 0.2;
                transition: width var(--animspeed) ease 0.1s, opacity var(--animspeed) ease 0.1s;

            }
            .container_cbd271:hover
            {
                width: 250px;
                opacity: 1;
            }
        ` : ""}
        /*Privacy blur*/
        ${Settings.plugins.Glide.privacyBlur ? `
                .header_f9f2ca,
                .container_ee69e0,
                .title_a7d72e,
                .layout_ec8679,
                [aria-label="Members"] {
                filter: blur(0);
                transition: filter 0.2s ease-in-out;
                }

                body:not(:hover) .header_f9f2ca,
                body:not(:hover) .container_ee69e0,
                body:not(:hover) .title_a7d72e,
                body:not(:hover) [aria-label="Members"],
                body:not(:hover) .layout_ec8679 {
                filter: blur(5px);
                }
        ` : ""}
        /*Tooltips*/
        [class*="tooltip"]
        {
            ${!Settings.plugins.Glide.tooltips ? "display: none !important;" : ""}
        }
        /*Root configs*/
        :root
        {
            --animspeed: ${Settings.plugins.Glide.animationSpeed + "s"};
            --font-primary: ${(fontName.length > 0 ? fontName : "Nunito")};
            --accent: #${Settings.plugins.Glide.Accent};
            --bgcol: #${Settings.plugins.Glide.Primary};
            --text: #${Settings.plugins.Glide.Text};
            --brand: #${Settings.plugins.Glide.Brand};
            --mutedtext: ${mute(Settings.plugins.Glide.Text, 20)};
            --mutedbrand: ${mute(Settings.plugins.Glide.Brand, 10)};
            --mutedaccent: ${mute(Settings.plugins.Glide.Accent, 10)};
        }
:root
{

    /*VARIABLES*/

        /*editable variables. Feel free to mess around with these to your hearts content, i recommend not editing the logic variables unless you have an understanding of css*/
        --glowcol: rgba(0, 0, 0, 0);
        --mentioncol: rgb(0, 0, 0);
        --mentionhighlightcol: rgb(0, 0, 0);
        --linkcol: rgb(95, 231, 255);
        --highlightcol: rgb(95, 231, 255);



    /*COLOR ASSIGNING  (most of these probably effect more than whats commented)*/

        /*accent based*/

            /*buttons*/
            --button-secondary-background: var(--accent);

            /*also buttons*/
            --brand-experiment: var(--brand);
            --brand-experiment-560: var(--brand);
            --brand-500: var(--brand);

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

            /*the side profile thingy*/
            --profile-body-background-color: var(--accent);

            /*the weird hover thing idk*/
            --background-modifier-hover: var(--mutedaccent) !important;


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

            /*call thingy*/
            --bg-overlay-app-frame: var(--bgcol);

            /*shop*/
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
            --text-muted: var(--mutedtext);
            --channels-default: var(--mutedtext);
            --interactive-normal: var(--text) !important;
            --white-500: var(--text);

}


        /*EXTRA COLORS*/

                [class*="tooltipPrimary__"]
                {
                    background-color: var(--mutedaccent) !important;
                }
                [class*="tooltipPointer_"]
                {
                    border-top-color: var(--mutedaccent) !important;
                }
                /*sorry, forgot to document what these are when i was adding them*/
                .inspector_c3120f, .scroller_d53d65, .unicodeShortcut_dfa278
                {
                    background-color: var(--bgcol);
                }
                .inner_effbe2
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
                .contentWrapper_af5dbb, .header_a3bc57
                {
                background-color: var(--bgcol);
                }
                /*vc background recolor*/
                .root_dd069c
                {
                    background-color: var(--bgcol);
                }

                /*Fix the forum page*/
                /*Set the bg color*/
                .container_a6d69a
                {
                    background-color: var(--bgcol);
                }
                /*Recolor the posts to the accent*/
                .container_d331f1
                {
                    background-color: var(--accent);
                }

                /*Recolor the background of stickers in the sticker picker that dont take up the full 1:1 ratio*/
                [id^="sticker-picker-grid"]
                {
                    background-color: var(--bgcol);
                }
                /* profile sidebar*/
                [class="none_eed6a8 scrollerBase_eed6a8"]
                {
                    background-color: var(--bgcol) !important;
                }
                /*Recolor the emoji, gif, and sticker picker selected button*/
                .navButtonActive_af5dbb, .stickerCategoryGenericSelected_a7a485, .categoryItemDefaultCategorySelected_dfa278
                {
                    background-color: var(--accent) !important;
                }

                /*side profile bar*/
                [class="none_c49869 scrollerBase_c49869"]
                {
                    background-color: var(--bgcol) !important;
                }
                .userPanelOverlayBackground_a2b6ae, .badgeList_ab525a
                {
                    background-color: var(--accent) !important;
                    border-radius: 15px !important;
                }
                /*uhhhhhhhhhhhhhhh*/
                .headerText_c47fa9
                {
                    color: var(--text) !important;
                }
                /*message bar placeholder*/
                .placeholder_a552a6
                {
                    color: var(--mutedtext) !important
                }
                .menu_d90b3d
                {
                    background: var(--accent) !important;
                }
                .messageGroupWrapper_ac90a2, .header_ac90a2
                {
                    background-color: var(--primary);
                }
                ${settings.store.pastelStatuses ?
            `
                    /*Pastel statuses*/
                    rect[fill='#23a55a'], svg[fill='#23a55a'] {
                        fill: #80c968 !important;
                    }
                    rect[fill='#f0b232'], svg[fill='#f0b232'] {
                        fill: #e7ca45 !important;
                    }
                    rect[fill='#f23f43'], svg[fill='#f23f43'] {
                        fill: #e0526c !important;
                    }
                    rect[fill='#80848e'], svg[fill='#80848e'] {
                        fill: #696e88 !important;
                    }
                    rect[fill='#593695'], svg[fill='#593695'] {
                        fill: #ac7de6 important;
                    }
                ` : ""}
                .name_d8bfb3
                {
                    color: var(--text) !important;
                }
                .unread_d8bfb3
                {
                    background-color: var(--text) !important;
                }

        /*ROUNDING (rounding)*/

                /*round message bar, some buttons, dm list button, new messages notif bar, channel buttons, emoji menu search bar, context menus, account connections(in that order)*/
                .scrollableContainer_bdf0de, .button_dd4f85, .interactive_f5eb4b, .newMessagesBar_cf58b5, .link_d8bfb3, .searchBar_c6ee36, .menu_d90b3d, .connectedAccountContainer_ab12c6
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

                .item_d90b3d
                {
                  border-radius: 15px;
                }



                /*slightly move messages right when hovered*/
                .cozyMessage_d5deea
                {
                    left: 0px;

                    transition-duration: 0.2s;
                }
                .cozyMessage_d5deea:hover
                {
                    left: 3px;
                }


        /*CONTENT (Typically changing values or hiding elements)*/

                /*remove status text in user thing*/
                .panelSubtextContainer_b2ca13
                {
                    display: none !important;
                }
                /*Hide most of the ugly useless scrollbars*/
                ::-webkit-scrollbar
                {
                    display:none;
                }


                /*Hide user profile button, the dm favourite, dm close, support, gift buttons, the now playing column, and the channel + favourite icons*/
                [aria-label="Hide User Profile"], .favoriteIcon_c91bad, .closeButton_c91bad, [href="https://support.discord.com"], .nowPlayingColumn_c2739c, button[aria-label="Send a gift"], .icon_d8bfb3, .iconContainer_d8bfb3
                {
                    display :none;
                }

                /*yeet the shitty nitro and family link tabs that no one likes*/
                .channel_c91bad[aria-posinset="2"],
                .familyCenterLinkButton_f0963d
                {
                    display: none;

                }
                /*Remove the buttons at the bottom of the user pop out (seriously, who wanted this?)*/
                .addFriendSection__413d3
                {
                    display: none;
                }

                /*No more useless spotify activity header*/
                .headerContainer_c1d9fd
                {
                    display: none;
                }
                /*hide sidebar connections*/
                .profilePanelConnections_b433b4
                {
                  display: none;
                }
                /*pad the message bar right slightly. Not sure what caused the buttons to flow out of it, might be something in the theme :shrug:*/
                .inner_bdf0de
                {
                    padding-right: 10px;
                }

                /*Yeet hypesquad badges (who cares)*/
                [aria-label*="HypeSquad"]
                {
                    display: none !important;
                }

                /*Hide icon on file uploading status*/
                .icon_b52bef
                {
                    display: none;
                }

                /*hide the play button while a soundmoji is playing*/
                .playing_bf9443 [viewBox="0 0 24 24"]
                {
                    display:none;
                }
                /*hide the public servers button on member list*/
                [aria-label="Explore Discoverable Servers"]
                {
                    display: none;
                }
                /*fix context menu being not symmetrical*/
                .scroller_d90b3d
                {
                    padding: 6px 8px !important;
                }
                /*Hide the icon that displays what platform the user is listening with on spotify status*/
                .platformIcon_c1d9fd
                {
                    display: none !important;
                }
                /*hide the album name on spotify statuses (who cares)*/
                [class="state_c1d9fd ellipsis_c1d9fd textRow_c1d9fd"]
                {
                    display: none;
                }
                /*space the connections a bit better*/
                .userInfoSection_a24910
                {
                    margin-bottom: 0px;
                    padding-bottom: 0px;
                }
                /*Space channels*/
                .containerDefault_f6f816
                {
                padding-top: 5px;
                }

                /*round banners in profile popout*/
                .banner_d5fdb1:not(.panelBanner_c3e427)
                {
                  border-radius: 20px;
                }
                /*round the user popout*/
                .userPopoutOuter_c69a7b
                {
                  border-radius: 25px;
                }
                /*round the inner profile popout*/
                [class="userPopoutInner_c69a7b userProfileInner_c69a7b userProfileInnerThemedWithBanner_c69a7b"]::before
                {
                border-radius: 20px;
                }
                .footer_be6801
                {
                    display: none !important;
                }

        /*STYLING (Modification of content to fit the theme)*/

                /*Round and scale down the users banner*/
                .panelBanner_c3e427
                {
                border-radius: 20px;
                transform: scale(0.95);
                }
                /*add a soft glow to message bar contents, user panel, dms, channel names (in that order)*/
                .inner_bdf0de .layout_ec8679, .name_d8bfb3
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
                .pointerEvents_c51b4e
                {
                    mask: url(#svg-mask-status-online);
                }
                */

                /*pfp uploader crosshair*/
                .overlayAvatar_ba5b9e
                {
                    background-image: url(https://raw.githubusercontent.com/Equicord/Equicord/main/src/equicordplugins/glide/crosshair.png);
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
                    text-shadow: 0px 0px 2px var(--highlightcol);
                }
                /*hide the line between connections and note*/
                [class="connectedAccounts_ab12c6 userInfoSection_a24910"]
                {
                    border-top: transparent !important;
                }
                .container_cebd1c:not(.checked_cebd1c)
                {
                    background-color: var(--mutedbrand) !important;
                }
                .checked_cebd1c
                {
                    background-color: var(--brand) !important;
                }
`;
}

export default definePlugin({
    name: "Glide",
    description: "A sleek, rounded theme for discord.",
    authors: [Devs.Samwich],
    settings,
    start() {
        injectCSS();
    },
    stop() {
        const injectedStyle = document.getElementById("GlideStyleInjection");
        if (injectedStyle) {
            injectedStyle.remove();
        }
    },
    startAt: StartAt.DOMContentLoaded,
    // preview thing, kinda low effort but eh
    settingsAboutComponent: () => <img src="https://files.catbox.moe/j8y2gt.webp" width="568px" border-radius="30px" ></img>
});
