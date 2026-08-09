/*
 * NeonGlass v7.5 — video background + full glassmorphism theme
 * Solid base (no OS transparency), self-reviving video, blob fallback
 * with forced MIME type, profile pop animations, ripples, parallax, glow.
 * Place in: src/plugins/NeonGlass/index.ts
 */


import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    videoUrl: {
        type: OptionType.STRING,
        description: "Background video URL (direct H.264 mp4/webm link). After changing, toggle the plugin off/on.",
        default: "https://cdn.discordapp.com/attachments/988242116004155502/1535899612357988422/ds7z7vt.mp4?ex=6a79717b&is=6a781ffb&hm=f7a1a50fee12e844dd47decba73e83b1bf44f1f012ab94f7c135e3c6a4b27751&"
    },
    glassOpacity: {
        type: OptionType.SLIDER,
        description: "Panel glass opacity (%)",
        markers: [0, 5, 10, 15, 20, 30, 50],
        default: 10,
        stickToMarkers: false
    },
    blur: {
        type: OptionType.SLIDER,
        description: "Glass blur (px)",
        markers: [0, 4, 8, 12, 16, 24],
        default: 10,
        stickToMarkers: false
    },
    dim: {
        type: OptionType.SLIDER,
        description: "Video dim (%) — raise if text is hard to read",
        markers: [0, 10, 25, 40, 60],
        default: 20,
        stickToMarkers: false
    },
    parallax: {
        type: OptionType.BOOLEAN,
        description: "Video parallax follows the mouse",
        default: true
    },
    ripple: {
        type: OptionType.BOOLEAN,
        description: "Neon ripple on every click",
        default: true
    },
    cursorGlow: {
        type: OptionType.BOOLEAN,
        description: "Soft glow trail following the cursor",
        default: true
    }
});

let video: HTMLVideoElement | null = null;
let dimLayer: HTMLDivElement | null = null;
let styleEl: HTMLStyleElement | null = null;
let glowEl: HTMLDivElement | null = null;
let reviveObserver: MutationObserver | null = null;
let blobUrl: string | null = null;
let onMouseMove: ((e: MouseEvent) => void) | null = null;
let onPointerDown: ((e: PointerEvent) => void) | null = null;

function buildCss(): string {
    const glass = (settings.store.glassOpacity / 100).toFixed(3);
    const glassHi = Math.min(1, settings.store.glassOpacity / 100 + 0.05).toFixed(3);
    const blur = settings.store.blur;

    return `
:root {
  --ng-glass: rgba(10,12,18,${glass});
  --ng-glass-hi: rgba(12,14,20,${glassHi});
  --ng-hover: rgba(255,255,255,0.06);
  --ng-border: rgba(255,255,255,0.10);
  --ng-cyan: #00f0ff; --ng-violet: #7000ff; --ng-pink: #ff00c8;
  --ng-gradient: linear-gradient(135deg,#00f0ff,#7000ff 55%,#ff00c8);
  --ng-blur: blur(${blur}px) saturate(140%);
  --ng-radius: 16px;
  --ng-spring: cubic-bezier(0.34,1.56,0.64,1);
  --ng-ease: cubic-bezier(0.4,0,0.2,1);
}

/* ===== Solid dark base — video sits on top, UI on top of that ===== */
html, body { background: #0b0c10 !important; }
#app-mount { background: transparent !important; }

/* ===== Discord variables: backgrounds only ===== */
.theme-dark, .theme-darker, .theme-midnight, .visual-refresh {
  --background-base-lowest: transparent !important;
  --background-base-lower: transparent !important;
  --background-base-low: transparent !important;
  --bg-overlay-color: transparent !important;
  --bg-overlay-color-inverse: transparent !important;
  --bg-overlay-app-frame: transparent !important;
  --bg-overlay-chat: transparent !important;
  --bg-overlay-sidebar: transparent !important;
  --background-primary: transparent !important;
  --background-secondary: rgba(16,18,24,0.25) !important;
  --background-secondary-alt: rgba(15,17,22,0.25) !important;
  --background-tertiary: rgba(10,11,15,0.25) !important;
  --background-floating: rgba(14,16,22,0.9) !important;
  --background-modifier-hover: rgba(255,255,255,0.05) !important;
  --background-modifier-selected: rgba(255,255,255,0.08) !important;
  --channeltextarea-background: transparent !important;
  --scrollbar-thin-thumb: rgba(255,255,255,0.2) !important;
  --scrollbar-auto-thumb: rgba(255,255,255,0.2) !important;
  --scrollbar-auto-track: transparent !important;
}

/* ===== Transparency chain (app layers only, NOT html/body) ===== */
[class*="appMount_"], [class*="app_"], [class*="appAsidePanelWrapper_"],
[class*="bg_"], [class*="layers_"], [class*="layer_"], [class*="baseLayer_"],
[class*="base_"], [class*="page_"], [class*="chat_"], [class*="guilds_"],
[class*="content_"], [class*="subtitleContainer_"], [class*="chatHeaderBar_"],
[class*="scroller_"], [class*="scrollerBase_"], [class*="tree_"],
[class*="sidebarRegion_"], [class*="contentRegion_"], [class*="chatLayerWrapper_"],
[class*="container_"] { background: transparent !important; }

/* Extra coverage: areas that stayed opaque (incl. home / DMs / friends) */
[class*="chatContainer_"], [class*="threadSidebar"], [class*="chatTarget"],
[class*="peopleColumn"], [class*="peopleList"], [class*="nowPlayingColumn"],
[class*="friendsRow"], [class*="searchResultsWrap"], [class*="messagesWrapper_"],
[class*="form_"], [class*="wrapper_"][class*="guilds"], [class*="listItem_"],
[class*="tabBody"], [class*="applicationStore"], [class*="pageWrapper"],
[class*="scrollerContainer_"], [class*="headerRow"], [class*="channelHeader"],
[class*="toolbar_"], [class*="drawerSizingWrapper"], [class*="floating_"],
[class*="quickswitcher_"], [class*="outer_"], [class*="privateChannels_"],
[class*="privateChannelsHeaderContainer_"] {
  background: transparent !important;
}

[class*="standardSidebarView_"] { background: rgba(10,11,15,0.4) !important; backdrop-filter: blur(16px); }

/* Voice/RTC panel: glass */
[class*="wrapper_"][class*="rtc"], [class*="voicePanel"], [class*="connection_"] {
  background: var(--ng-glass-hi) !important;
  backdrop-filter: var(--ng-blur);
}

/* Friends / active-now cards: glass */
[class*="card_"], [class*="activityCard"] {
  background: var(--ng-glass-hi) !important;
  border: 1px solid var(--ng-border) !important;
  border-radius: 14px !important;
}

/* ===== Keyframes ===== */
@keyframes ng-drift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
@keyframes ng-pulse { 0%{box-shadow:0 0 0 0 rgba(0,240,255,.6)} 70%{box-shadow:0 0 0 8px rgba(0,240,255,0)} 100%{box-shadow:0 0 0 0 rgba(0,240,255,0)} }
@keyframes ng-breathe { 0%,100%{box-shadow:0 0 18px rgba(0,240,255,.15),inset 0 0 0 1px var(--ng-border)} 50%{box-shadow:0 0 32px rgba(112,0,255,.28),inset 0 0 0 1px rgba(0,240,255,.2)} }
@keyframes ng-slide-in { from{opacity:0;transform:translateY(14px) scale(.985)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes ng-slide-right { from{opacity:0;transform:translateX(-14px)} to{opacity:1;transform:translateX(0)} }
@keyframes ng-pop { 0%{transform:scale(.3);opacity:0} 60%{transform:scale(1.25)} 100%{transform:scale(1);opacity:1} }
@keyframes ng-shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
@keyframes ng-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes ng-wiggle { 0%,100%{transform:rotate(0) scale(1.12)} 25%{transform:rotate(-6deg) scale(1.12)} 75%{transform:rotate(6deg) scale(1.12)} }
@keyframes ng-heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.12)} 28%{transform:scale(1)} 42%{transform:scale(1.08)} }
@keyframes ng-rainbow { 0%{border-color:rgba(0,240,255,.45)} 33%{border-color:rgba(112,0,255,.45)} 66%{border-color:rgba(255,0,200,.45)} 100%{border-color:rgba(0,240,255,.45)} }
@keyframes ng-glint { from{transform:translateX(-150%) skewX(-20deg)} to{transform:translateX(350%) skewX(-20deg)} }
@keyframes ng-btn-glow { 0%,100%{box-shadow:0 0 8px rgba(0,240,255,.15)} 50%{box-shadow:0 0 18px rgba(112,0,255,.35)} }
@keyframes ng-btn-press { 0%{transform:scale(1)} 40%{transform:scale(.92)} 100%{transform:scale(1)} }
@keyframes ng-ripple { from{transform:scale(0);opacity:.6} to{transform:scale(1);opacity:0} }
@keyframes ng-star { 0%{transform:translateX(-110%) rotate(8deg);opacity:0} 10%{opacity:.7} 90%{opacity:.7} 100%{transform:translateX(110vw) rotate(8deg);opacity:0} }
@keyframes ng-profile-in {
  0%   { opacity: 0; transform: scale(0.85) translateY(12px); }
  60%  { transform: scale(1.03) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

/* ===== Panels ===== */
[class*="sidebar_"], [class*="sidebarList_"] {
  background: var(--ng-glass) !important;
  backdrop-filter: var(--ng-blur); -webkit-backdrop-filter: var(--ng-blur);
  border-right: 1px solid var(--ng-border);
  position: relative;
}
[class*="members_"] {
  background: var(--ng-glass) !important;
  backdrop-filter: var(--ng-blur); -webkit-backdrop-filter: var(--ng-blur);
  border-left: 1px solid var(--ng-border);
}
[class*="membersWrap_"] { background: transparent !important; min-width: 0 !important; }
[class*="chatContent_"] {
  background: var(--ng-glass) !important;
  backdrop-filter: var(--ng-blur); -webkit-backdrop-filter: var(--ng-blur);
  border: 1px solid var(--ng-border); border-radius: var(--ng-radius);
  margin: 10px 10px 0 10px; overflow: hidden;
  animation: ng-slide-in 350ms var(--ng-ease), ng-rainbow 12s linear infinite;
}
[class*="panels_"] {
  background: var(--ng-glass-hi) !important;
  backdrop-filter: var(--ng-blur); -webkit-backdrop-filter: var(--ng-blur);
  border: 1px solid var(--ng-border); border-radius: var(--ng-radius);
  margin: 0 8px 8px 8px;
  animation: ng-float 5s ease-in-out infinite;
}
[class*="titleBar_"] { background: rgba(10,12,18,0.15) !important; backdrop-filter: var(--ng-blur); border-bottom: 1px solid var(--ng-border); }
[class*="sidebar_"], [class*="chatContent_"], [class*="members_"], [class*="panels_"] { text-shadow: 0 1px 3px rgba(0,0,0,.6); }

/* Shooting star across the sidebar */
[class*="sidebar_"]::after {
  content: ""; position: absolute; top: 15%; left: 0; width: 60%; height: 1px;
  background: linear-gradient(90deg, transparent, var(--ng-cyan), transparent);
  animation: ng-star 12s linear infinite; pointer-events: none;
}

/* ===== Server rail ===== */
[class*="blobContainer_"] { transition: transform 320ms var(--ng-spring), filter 320ms var(--ng-ease); }
[class*="blobContainer_"]:hover { animation: ng-wiggle 500ms var(--ng-ease); filter: drop-shadow(0 0 10px rgba(0,240,255,.45)); }
[class*="blobContainer_"]:active { transform: scale(.94); }
[class*="blobContainer_"][class*="selected_"] img { border-radius: 30% !important; box-shadow: 0 0 16px rgba(112,0,255,.6); }
[class*="pill_"] > span {
  background: var(--ng-gradient) !important; background-size: 100% 300%;
  width: 4px !important; border-radius: 4px;
  box-shadow: 0 0 14px rgba(0,240,255,.7);
  animation: ng-drift 4s ease infinite; transition: height 300ms var(--ng-spring);
}

/* ===== Channels ===== */
[class*="containerDefault_"] { animation: ng-slide-right 340ms var(--ng-ease) backwards; }
[class*="containerDefault_"]:nth-child(2){animation-delay:40ms} [class*="containerDefault_"]:nth-child(3){animation-delay:60ms}
[class*="containerDefault_"]:nth-child(4){animation-delay:80ms} [class*="containerDefault_"]:nth-child(5){animation-delay:100ms}
[class*="containerDefault_"]:nth-child(6){animation-delay:120ms} [class*="containerDefault_"]:nth-child(7){animation-delay:140ms}
[class*="containerDefault_"]:nth-child(8){animation-delay:160ms}
[class*="containerDefault_"] [class*="link_"] {
  border-radius: 12px;
  transition: background 180ms var(--ng-ease), transform 220ms var(--ng-spring), box-shadow 220ms var(--ng-ease);
}
[class*="containerDefault_"]:hover [class*="link_"] {
  background: var(--ng-hover); transform: translateX(5px);
  box-shadow: -3px 0 10px -4px rgba(0,240,255,.4);
}
[class*="containerDefault_"] [class*="iconContainer_"] svg { transition: transform 250ms var(--ng-spring); }
[class*="containerDefault_"]:hover [class*="iconContainer_"] svg { transform: rotate(-10deg) scale(1.15); }
[class*="modeSelected_"] [class*="link_"] {
  background: rgba(255,255,255,.08) !important;
  box-shadow: inset 2px 0 0 var(--ng-cyan);
  animation: ng-breathe 4s ease-in-out infinite;
}
[class*="modeConnected_"] [class*="link_"] { background: rgba(255,255,255,.06) !important; animation: ng-breathe 3s ease-in-out infinite; }
[class*="numberBadge_"] {
  background: var(--ng-gradient) !important; background-size: 250% 250%;
  animation: ng-pop 380ms var(--ng-spring), ng-drift 5s ease infinite, ng-heartbeat 2.5s ease infinite 1s;
  box-shadow: 0 0 14px rgba(255,0,200,.45);
}
[class*="header_"]:hover [class*="headerContent_"] {
  background: linear-gradient(90deg,var(--ng-cyan),var(--ng-violet),var(--ng-cyan));
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  animation: ng-shimmer 2.5s linear infinite;
}

/* Voice users */
[class*="voiceUser_"] { animation: ng-slide-right 300ms var(--ng-spring) backwards; }
[class*="voiceUser_"] [class*="avatar"] { border-radius: 50%; transition: transform 200ms var(--ng-spring), box-shadow 400ms var(--ng-ease); }
[class*="voiceUser_"]:hover [class*="avatar"] { transform: scale(1.15); box-shadow: 0 0 0 2px var(--ng-cyan), 0 0 18px rgba(0,240,255,.55); }
[class*="avatarSpeaking_"] { box-shadow: 0 0 0 2px var(--ng-cyan), 0 0 12px rgba(0,240,255,.7) !important; animation: ng-pulse 1.6s ease infinite; }

/* ===== Messages ===== */
[class*="messageListItem_"] { animation: ng-slide-in 320ms var(--ng-ease) backwards; }
[class*="cozyMessage_"] { border-radius: 12px; transition: background 180ms var(--ng-ease), transform 180ms var(--ng-ease); }
[class*="cozyMessage_"]:hover { background: var(--ng-hover) !important; transform: translateX(2px); }
[class*="message_"] [class*="avatar_"] { border-radius: 50%; transition: transform 260ms var(--ng-spring), box-shadow 400ms var(--ng-ease); }
[class*="message_"] [class*="avatar_"]:hover { transform: scale(1.18) rotate(3deg); box-shadow: 0 0 0 2px var(--ng-cyan), 0 0 16px rgba(0,240,255,.5); }
[class*="mentioned_"] { background: rgba(112,0,255,.15) !important; box-shadow: inset 3px 0 0 var(--ng-violet); }
[class*="embedFull_"], [class*="attachment_"] {
  background: rgba(16,18,26,.35) !important; border: 1px solid var(--ng-border) !important;
  border-radius: 12px !important; transition: transform 240ms var(--ng-spring), box-shadow 240ms var(--ng-ease);
}
[class*="embedFull_"]:hover, [class*="attachment_"]:hover { transform: translateY(-3px); box-shadow: 0 10px 28px -8px rgba(0,240,255,.2); }
[class*="imageWrapper_"] img { transition: transform 400ms var(--ng-ease); }
[class*="imageWrapper_"]:hover img { transform: scale(1.03); }
[class*="reaction_"] {
  background: rgba(255,255,255,.05) !important; border: 1px solid var(--ng-border) !important;
  border-radius: 10px !important; animation: ng-pop 300ms var(--ng-spring);
  transition: transform 180ms var(--ng-spring), border-color 180ms, box-shadow 180ms;
}
[class*="reaction_"]:hover { transform: scale(1.12); border-color: rgba(0,240,255,.4) !important; box-shadow: 0 0 10px rgba(0,240,255,.25); }
[class*="buttonContainer_"] [class*="buttons_"] {
  background: rgba(14,16,22,.85) !important; backdrop-filter: blur(12px);
  border: 1px solid var(--ng-border); border-radius: 10px; animation: ng-pop 220ms var(--ng-spring);
}
[class*="divider_"][class*="isUnread_"] { border-color: var(--ng-cyan) !important; box-shadow: 0 0 8px rgba(0,240,255,.5); }

/* ===== Input ===== */
[class*="channelTextArea_"] {
  background: rgba(10,12,18,.2) !important;
  backdrop-filter: var(--ng-blur); -webkit-backdrop-filter: var(--ng-blur);
  border: 1px solid var(--ng-border); border-radius: var(--ng-radius);
  margin: 0 6px 16px 6px;
  transition: box-shadow 300ms var(--ng-ease);
}
[class*="channelTextArea_"]:focus-within {
  box-shadow: 0 0 24px -4px rgba(0,240,255,.4);
  animation: ng-float 3s ease-in-out infinite, ng-rainbow 8s linear infinite;
}
[class*="channelTextArea_"] [class*="button_"]:hover { transform: scale(1.2) rotate(-6deg); }
[class*="expression"] button:hover { animation: ng-wiggle 450ms var(--ng-ease); }

/* ===== Members ===== */
[class*="member_"] { animation: ng-slide-right 300ms var(--ng-ease) backwards; }
[class*="member_"] [class*="layout_"] { border-radius: 12px; transition: background 160ms, transform 200ms var(--ng-spring); }
[class*="member_"]:hover [class*="layout_"] { background: var(--ng-hover); transform: translateX(-4px); }
[class*="member_"] [class*="avatar_"] { border-radius: 50%; transition: transform 220ms var(--ng-spring), box-shadow 400ms; }
[class*="member_"]:hover [class*="avatar_"] { transform: scale(1.15); box-shadow: 0 0 0 2px var(--ng-cyan), 0 0 18px rgba(0,240,255,.55); }

/* ===== ALL buttons: transparent glass + motion ===== */
button, [role="button"] {
  transition: transform 200ms var(--ng-spring), box-shadow 250ms var(--ng-ease), background 150ms var(--ng-ease) !important;
}
button:hover, [role="button"]:hover { transform: scale(1.06); }
button:active, [role="button"]:active { animation: ng-btn-press 250ms var(--ng-spring); }
button[class*="lookFilled_"], button[class*="lookOutlined_"] {
  background: rgba(255,255,255,.06) !important;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.12) !important;
  border-radius: 12px; position: relative; overflow: hidden;
  animation: ng-btn-glow 4s ease-in-out infinite;
}
button[class*="lookFilled_"][class*="colorBrand_"] {
  background: linear-gradient(135deg,rgba(0,240,255,.35),rgba(112,0,255,.35),rgba(255,0,200,.35)) !important;
  background-size: 250% 250%;
  animation: ng-btn-glow 4s ease-in-out infinite, ng-drift 6s ease infinite;
}
button[class*="lookFilled_"]::after {
  content: ""; position: absolute; top: 0; bottom: 0; width: 40%;
  background: linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);
  transform: translateX(-150%) skewX(-20deg); pointer-events: none;
}
button[class*="lookFilled_"]:hover { transform: scale(1.07) translateY(-2px); box-shadow: 0 0 24px rgba(0,240,255,.5) !important; border-color: rgba(0,240,255,.5) !important; }
button[class*="lookFilled_"]:hover::after { animation: ng-glint 700ms var(--ng-ease); }
[class*="panels_"] button:hover, [class*="actionButtons_"] button:hover { transform: scale(1.18) !important; box-shadow: 0 0 16px rgba(0,240,255,.45); }

/* ===== Profile popouts and modals: pop-in + cascade ===== */
[class*="layerContainer_"] > * > *,
[class*="layerContainer_"] [class*="userPopout"],
[class*="layerContainer_"] [class*="userProfile"],
[class*="userProfileOuter"], [class*="userProfileModal"],
[class*="profilePopout"], [class*="fullscreenPopoutWrapper"] {
  animation: ng-profile-in 340ms var(--ng-spring) !important;
  transform-origin: top center;
}
[class*="userProfileModal"], [class*="userProfileOuter"] {
  background: rgba(12,13,18,.82) !important;
  backdrop-filter: var(--ng-blur);
  border: 1px solid var(--ng-border);
  border-radius: 18px !important;
  overflow: hidden;
}
[class*="userProfileOuter"] [class*="banner"] { transition: transform 6s var(--ng-ease); }
[class*="userProfileOuter"]:hover [class*="banner"] { transform: scale(1.06); }
[class*="userProfileOuter"] [class*="avatar"] { animation: ng-pop 450ms var(--ng-spring) 100ms backwards; }
[class*="userProfileOuter"] [class*="body"] > * { animation: ng-slide-in 350ms var(--ng-ease) backwards; }
[class*="userProfileOuter"] [class*="body"] > *:nth-child(2) { animation-delay: 60ms; }
[class*="userProfileOuter"] [class*="body"] > *:nth-child(3) { animation-delay: 120ms; }
[class*="userProfileOuter"] [class*="body"] > *:nth-child(4) { animation-delay: 180ms; }

/* ===== Menus / modals / tooltips ===== */
[class*="modal_"] [class*="root_"] {
  background: rgba(12,13,18,.8) !important;
  backdrop-filter: var(--ng-blur); border: 1px solid var(--ng-border);
  border-radius: 18px !important; animation: ng-slide-in 320ms var(--ng-spring);
}
[class*="backdrop_"] { background: rgba(5,6,9,.45) !important; backdrop-filter: blur(6px); }
[class*="menu_"], [class*="popout_"] {
  background: rgba(13,14,20,.88) !important;
  backdrop-filter: var(--ng-blur); border: 1px solid var(--ng-border);
  border-radius: 14px; animation: ng-pop 240ms var(--ng-spring);
}
[class*="menu_"] [class*="item_"] { border-radius: 8px; transition: background 120ms, padding-left 160ms var(--ng-ease); }
[class*="menu_"] [class*="item_"]:hover { padding-left: 12px; }
[class*="tooltip_"] { background: rgba(13,14,20,.95) !important; border: 1px solid var(--ng-border) !important; border-radius: 10px !important; animation: ng-pop 200ms var(--ng-spring); }

/* ===== Scrollbars ===== */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg,rgba(0,240,255,.3),rgba(112,0,255,.3)); border-radius: 8px; }
::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg,var(--ng-cyan),var(--ng-violet)); }
::-webkit-scrollbar-track, ::-webkit-scrollbar-corner { background: transparent; }
::selection { background: rgba(0,240,255,.25); }

/* ===== JS-driven elements ===== */
.ng-ripple-dot {
  position: fixed; border-radius: 50%; pointer-events: none; z-index: 9999;
  background: radial-gradient(circle, rgba(0,240,255,.5), rgba(112,0,255,.25) 60%, transparent 70%);
  animation: ng-ripple 600ms var(--ng-ease) forwards;
}
#ng-cursor-glow {
  position: fixed; width: 300px; height: 300px; border-radius: 50%;
  pointer-events: none; z-index: 1;
  background: radial-gradient(circle, rgba(0,240,255,.07), transparent 70%);
  transform: translate(-50%,-50%);
  transition: left 120ms linear, top 120ms linear;
}
`;
}

export default definePlugin({
    name: "NeonGlass",
    description: "A clean Discord UI with better animations and customization — make Discord your own.",
    authors: [{ name: "_baka_baka", id: 876618279609843724n }],
    settings,

    start() {
        // 1. Video background — body-mounted, self-reviving, blob fallback for CSP
        const createVideo = () => {
            video = document.createElement("video");
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.preload = "auto";
            video.id = "ng-video-bg";
            Object.assign(video.style, {
                position: "fixed", top: "0", left: "0",
                width: "100vw", height: "100vh",
                objectFit: "cover", zIndex: "0", pointerEvents: "none",
                transform: "scale(1.08)", transition: "transform 400ms ease-out"
            } as Partial<CSSStyleDeclaration>);

            let triedBlob = false;
            video.onerror = async () => {
                if (triedBlob) {
                    console.error("[NeonGlass] Video failed even via blob. The file is likely an unsupported codec (must be H.264) or the URL is dead:", settings.store.videoUrl);
                    return;
                }
                triedBlob = true;
                console.warn("[NeonGlass] Direct load blocked, retrying via blob fetch...");
                try {
                    const res = await fetch(settings.store.videoUrl);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const blob = new Blob([await res.arrayBuffer()], { type: "video/mp4" });
                    blobUrl = URL.createObjectURL(blob);
                    if (video) video.src = blobUrl;
                } catch (e) {
                    console.error("[NeonGlass] Blob fetch failed:", e);
                }
            };
            video.oncanplay = () => {
                console.log("[NeonGlass] Video ready, playing.");
                video?.play().catch(e => console.error("[NeonGlass] Autoplay blocked:", e));
            };

            video.src = settings.store.videoUrl;
            document.body.prepend(video);
        };
        createVideo();

        // 2. Dim layer for readability (above video via source order)
        dimLayer = document.createElement("div");
        dimLayer.id = "ng-video-dim";
        Object.assign(dimLayer.style, {
            position: "fixed", top: "0", left: "0",
            width: "100vw", height: "100vh",
            zIndex: "0", pointerEvents: "none",
            background: `rgba(5,6,10,${settings.store.dim / 100})`
        } as Partial<CSSStyleDeclaration>);
        document.body.insertBefore(dimLayer, video!.nextSibling);

        // 2b. Revive video/dim if anything removes them
        reviveObserver = new MutationObserver(() => {
            if (video && !document.body.contains(video)) {
                console.warn("[NeonGlass] Video was removed, re-adding.");
                document.body.prepend(video);
            }
            if (dimLayer && !document.body.contains(dimLayer)) {
                document.body.insertBefore(dimLayer, video ? video.nextSibling : document.body.firstChild);
            }
        });
        reviveObserver.observe(document.body, { childList: true });

        // 3. Theme CSS
        styleEl = document.createElement("style");
        styleEl.id = "ng-style";
        styleEl.textContent = buildCss();
        document.head.appendChild(styleEl);

        // 4. Cursor glow
        if (settings.store.cursorGlow) {
            glowEl = document.createElement("div");
            glowEl.id = "ng-cursor-glow";
            document.body.appendChild(glowEl);
        }

        // 5. Parallax + glow tracking
        onMouseMove = (e: MouseEvent) => {
            if (settings.store.parallax && video) {
                const x = (e.clientX / window.innerWidth - 0.5) * -20;
                const y = (e.clientY / window.innerHeight - 0.5) * -12;
                video.style.transform = `scale(1.08) translate(${x}px, ${y}px)`;
            }
            if (glowEl) {
                glowEl.style.left = e.clientX + "px";
                glowEl.style.top = e.clientY + "px";
            }
        };
        window.addEventListener("mousemove", onMouseMove);

        // 6. Click ripples
        onPointerDown = (e: PointerEvent) => {
            if (!settings.store.ripple) return;
            const r = document.createElement("div");
            r.className = "ng-ripple-dot";
            const size = 90;
            Object.assign(r.style, {
                left: e.clientX - size / 2 + "px",
                top: e.clientY - size / 2 + "px",
                width: size + "px", height: size + "px"
            } as Partial<CSSStyleDeclaration>);
            document.body.appendChild(r);
            setTimeout(() => r.remove(), 650);
        };
        window.addEventListener("pointerdown", onPointerDown);
    },

    stop() {
        reviveObserver?.disconnect(); reviveObserver = null;
        video?.remove(); video = null;
        dimLayer?.remove(); dimLayer = null;
        styleEl?.remove(); styleEl = null;
        glowEl?.remove(); glowEl = null;
        if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
        if (onMouseMove) window.removeEventListener("mousemove", onMouseMove);
        if (onPointerDown) window.removeEventListener("pointerdown", onPointerDown);
        onMouseMove = onPointerDown = null;
    }
});
