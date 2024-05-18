/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { findComponentByCode } from "@webpack";
import { Button, Clipboard, Forms, TextInput, Toasts, UserStore, useState } from "@webpack/common";

interface ThemePreset {
    bgcol: string;
    accentcol: string;
    textcol: string;
    brand: string;
    name: string;
}

const solarTheme = {
    bgcol: "0e2936",
    accentcol: "0c2430",
    textcol: "99b0bd",
    brand: "124057",
    name: "Solar"
};

const amoledTheme = {
    bgcol: "000000",
    accentcol: "020202",
    textcol: "c0d5e4",
    brand: "070707",
    name: "Amoled"
};

const indigoTheme = {
    bgcol: "0e0e36",
    accentcol: "0e0c30",
    textcol: "bdbfd8",
    brand: "171750",
    name: "Indigo"
};

const grapeFruitTheme = {
    bgcol: "8a2b5f",
    accentcol: "812658",
    textcol: "ffedfb",
    brand: "b23982",
    name: "Grapefruit"
};


const crimsonTheme = {
    bgcol: "410b05",
    accentcol: "360803",
    textcol: "f8e6e6",
    brand: "681109",
    name: "Crimson"
};

const azureTheme = {
    bgcol: "184e66",
    accentcol: "215a72",
    textcol: "d0efff",
    brand: "2d718f",
    name: "Azure"
};

const blackberryTheme = {
    bgcol: "1d091a",
    accentcol: "240d21",
    textcol: "f3e1f0",
    brand: "411837",
    name: "Blackberry"
};

const porpleTheme = {
    bgcol: "1f073b",
    accentcol: "250b44",
    textcol: "dfd7e9",
    brand: "340d63",
    name: "Porple"
};

const charcoalTheme = {
    bgcol: "0a0a0a",
    accentcol: "0f0f0f",
    textcol: "c9c9c9",
    brand: "0a0a0a",
    name: "Charcoal"
};

const lofipopTheme = {
    bgcol: "00345b",
    accentcol: "002f53",
    textcol: "e7d8df",
    brand: "944068",
    name: "Lofi Pop"
};

const oakenTheme = {
    bgcol: "471b05",
    accentcol: "4e2009",
    textcol: "ffffff",
    brand: "903e14",
    name: "Oaken"
};

let setPreset;

const themes = [amoledTheme, solarTheme, indigoTheme, grapeFruitTheme, crimsonTheme, azureTheme, blackberryTheme, porpleTheme, charcoalTheme, lofipopTheme, oakenTheme];

function LoadPreset() {
    if (setPreset === settings.store.ColorPreset) { return; }
    const theme: ThemePreset = themes[settings.store.ColorPreset];
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
const ${name.toLowerCase().replaceAll(" ", "")}Theme = {
    bgcol: "${settings.store.Primary}",
    accentcol: "${settings.store.Accent}",
    textcol: "${settings.store.Text}",
    brand: "${settings.store.Brand}",
    name: "${name}"
}; 
    `;
    if (Clipboard.SUPPORTS_COPY) {
        Clipboard.copy(template);
    }

}

function CopyPresetComponent() {

    const [inputtedName, setInputtedName] = useState("");

    const currentUser = UserStore.getCurrentUser();
    return (
        currentUser.id === "976176454511509554" && (
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
            </>
        )
        ||
        (
            <></>
        )
    );
}

const ColorPicker = findComponentByCode(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)");


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
        onChange: () => injectCSS()
    },
    animationSpeed: {
        type: OptionType.STRING,
        description: "The speed of animations",
        default: "0.2",
        onChange: () => injectCSS()
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
    ExportPreset:
    {
        type: OptionType.COMPONENT,
        description: "just a lil dev thingy for me",
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
    if (customFontString === null) { return; }
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
        ${Settings.plugins.Glide.memberListAnim ? `
            .container_f79ab4 
            {
                width: 60px;
                opacity: 0.2;
                transition: width var(--animspeed) ease 0.1s, opacity var(--animspeed) ease 0.1s;
            
            }
            .container_f79ab4:hover 
            {
                width: 250px;
                opacity: 1;    
            }
        ` : ""}
        /*Privacy blur*/
        ${Settings.plugins.Glide.privacyBlur ? `
                .header__6a14d,
                .container__7e23c,
                .title_d4ba1a,
                .layout__59abc,
                [aria-label="Members"] {
                filter: blur(0); 
                transition: filter 0.2s ease-in-out; 
                }

                body:not(:hover) .header__6a14d,
                body:not(:hover) .container__7e23c,
                body:not(:hover) .title_d4ba1a,
                body:not(:hover) [aria-label="Members"],
                body:not(:hover) .layout__59abc {
                filter: blur(5px); 
                }
        ` : ""}
        /*Tooltips*/
        ${!Settings.plugins.Glide.tooltips ? `
            [class*="tooltip"]
            {
                display: none !important;
            }
        ` : ""}
        /*Root configs*/
        :root
        {
            --animspeed: ${Settings.plugins.Glide.animationSpeed + "s"};
            --font-primary: ${(fontName.length > 0 ? fontName : "Nunito")};        
            --accent: #${Settings.plugins.Glide.Accent};
            --bgcol: #${Settings.plugins.Glide.Primary};
            --text: #${Settings.plugins.Glide.Text};
            --brand: #${Settings.plugins.Glide.Brand};
            --mutedtext: ${mute(Settings.plugins.Glide.Text, 30)};
            --mutedbrand: ${mute(Settings.plugins.Glide.Brand, 30)};
            --mutedaccent: ${mute(Settings.plugins.Glide.Accent, 3)};
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
            --background-modifier-hover: var(--accent);


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
            --text-muted: var(--mutedtext);
            --channels-default: var(--mutedtext);
            --interactive-normal: var(--text) !important;
            --white-500: var(--text);
}


        /*EXTRA COLORS*/

                /*sorry, forgot to document what these are when i was adding them*/
                .inspector__80c84, .scroller_ac6d1c, .unicodeShortcut__01a83
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
                .contentWrapper_e0bb2c, .header__3028e
                {
                background-color: var(--bgcol);
                }
                /*vc background recolor*/
                .root__3eef0
                {
                    background-color: var(--bgcol);
                }

                /*Fix the forum page*/
                /*Set the bg color*/
                .container_b92032
                {
                    background-color: var(--bgcol);
                }
                /*Recolor the posts to the accent*/
                .container_de2a56
                {
                    background-color: var(--accent);
                }

                /*Recolor the background of stickers in the sticker picker that dont take up the full 1:1 ratio*/
                [id^="sticker-picker-grid"]
                {
                    background-color: var(--bgcol);
                }
                /* profile sidebar*/
                [class="none__7a473 scrollerBase_f742b2"]
                {
                    background-color: var(--bgcol) !important;
                }
                /*Recolor the emoji, gif, and sticker picker selected button*/
                .navButtonActive__0c878, .stickerCategoryGenericSelected_b553f9, .categoryItemDefaultCategorySelected__7d6e0
                {
                    background-color: var(--accent) !important;
                }

                /*side profile bar*/
                [class="none_ff9f86 scrollerBase__65223"]
                {
                    background-color: var(--bgcol) !important;
                }
                .userPanelOverlayBackground__41589, .badgeList__76720
                {
                    background-color: var(--accent) !important;
                    border-radius: 15px !important;
                }
                /*uhhhhhhhhhhhhhhh*/
                .headerText__88997
                {
                    color: var(--text) !important;
                }
                /*message bar placeholder*/
                .placeholder_dec8c7
                {
                    color: var(--mutedtext) !important
                }

        /*ROUNDING (rounding)*/

                /*round message bar, some buttons, dm list button, new messages notif bar, channel buttons, emoji menu search bar, context menus, account connections(in that order)*/
                .scrollableContainer_ff917f, .button__581d0, .interactive__0786a, .newMessagesBar__8b272, .link_ddbb36, .searchBar__57f39, .menu__088f7, .connectedAccountContainer__5972d
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
                .cozyMessage__9f4fd
                {
                    left: 0px;
                
                    transition-duration: 0.2s;
                }
                .cozyMessage__9f4fd:hover 
                {
                    left: 3px;
                }


        /*CONTENT (Typically changing values or hiding elements)*/

                /*remove status text in user thing*/
                .panelSubtextContainer_fd5930
                {
                    display: none !important;
                }
                /*Hide most of the ugly useless scrollbars*/
                ::-webkit-scrollbar 
                {
                    display:none;
                }


                /*Hide user profile button, the dm favourite, dm close, support, gift buttons, the now playing column, and the channel + favourite icons*/
                [aria-label="Hide User Profile"], .favoriteIcon__03348, .closeButton__116c3, [href="https://support.discord.com"], .nowPlayingColumn_b025fe, button[aria-label="Send a gift"], .icon__67ab4, .iconContainer__6a580
                {
                    display :none;
                }

                /*yeet the shitty nitro and family link tabs that no one likes*/
                .channel__0aef5[aria-posinset="2"],
                .familyCenterLinkButton_ab1e00 
                {
                    display: none;
                
                }
                /*Remove the buttons at the bottom of the user pop out (seriously, who wanted this?)*/
                .addFriendSection__413d3
                {
                    display: none;
                }
                
                /*No more useless spotify activity header*/
                .headerContainer_b7a30f
                {
                    display: none;
                }
                /*hide sidebar connections*/
                .profilePanelConnections__34438
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
                .icon_df1a3e
                {
                    display: none;
                }
                
                /*hide the play button while a soundmoji is playing*/
                .playing_a99371 [viewBox="0 0 24 24"] 
                {
                    display:none;
                }
                /*hide the public servers button on member list*/
                [aria-label="Explore Discoverable Servers"]
                {
                    display: none;
                }
                /*fix context menu being not symmetrical*/
                .scroller__8f066
                {
                    padding: 6px 8px !important;
                }        
                /*Hide the icon that displays what platform the user is listening with on spotify status*/
                .platformIcon_a2d873
                {
                    display: none !important;
                }
                /*hide the album name on spotify statuses (who cares)*/
                [class="state_a85ac0 ellipsis__46552 textRow_c835f1"]
                {
                    display: none;
                }
                /*space the connections a bit better*/
                .userInfoSection_e816c1
                {
                    margin-bottom: 0px;
                    padding-bottom: 0px;
                }
                /*Space channels*/
                .containerDefault_ae2ea4
                {
                padding-top: 5px;
                }

                /*round banners in profile popout*/
                .banner__6d414:not(.panelBanner__7d7e2)
                {
                  border-radius: 20px;
                }
                /*round the user popout*/
                .userPopoutOuter__3884e
                {
                  border-radius: 25px;
                }                       
                /*round the inner profile popout*/
                [class="userPopoutInner_e90432 userProfileInner__61cc1 userProfileInnerThemedWithBanner__2152d"]::before
                {
                border-radius: 20px;
                }

        /*STYLING (Modification of content to fit the theme)*/

                /*Round and scale down the users banner*/
                .panelBanner__7d7e2
                {
                border-radius: 20px;
                transform: scale(0.95);
                }
                /*add a soft glow to message bar contents, user panel, dms, channel names (in that order)*/
                .inner__9fd0b .layout__59abc, .name__4eb92
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
                .pointerEvents__585e6
                {
                    mask: url(#svg-mask-status-online);
                }
                */

                /*pfp uploader crosshair*/
                .overlayAvatar__5b2a6
                {
                background-image: url(https://raw.githubusercontent.com/cheesesamwich/Glide/main/crosshair.png);
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
                [class="connectedAccounts__7a8e6 userInfoSection_e816c1"]
                {
                    border-top: transparent !important;
                }
`;
}
export default definePlugin({
    name: "Glide",
    description: "A sleek, rounded theme for discord.",
    authors:
        [
            Devs.Samwich
        ],
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
    startAt: StartAt.DOMContentLoaded

});


