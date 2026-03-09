import "./style.css";

import { definePluginSettings, Settings } from "@api/Settings";
import { ChatBarButton, ChatBarProps } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

export const settings = definePluginSettings({
    themeList: {
        type: OptionType.STRING,
        default: "",
        description: "List of themes (single/double quoted) to cycle through, separated by commas. Leave empty to cycle through ALL installed themes.",
    },
    includeQuickCss: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Include QuickCSS in the cycle",
    },
    showChatButton: {
        name: "Show Switcher Button",
        type: OptionType.BOOLEAN,
        default: false,
        description: "Shows a Switcher button in chatbar",
    }
});

function ThemeSwitcherIcon() {
    return (
        <svg viewBox="0 0 24 24" width={20} height={20} className="vc-theme-switcher-icon">
            <rect x="2" y="6.5" width="16" height="2" rx="1" fill="currentColor" />
            <polygon points="16,3 22,7.5 16,12" fill="currentColor" />
            <polygon points="8,11.5 2,16 8,20.5" fill="currentColor" />
            <rect x="6" y="14.5" width="16" height="2" rx="1" fill="currentColor" />
        </svg>
    );
}

async function cycleTheme() {
    const allThemes = await VencordNative.themes.getThemesList();
    const userThemeList = settings.store.themeList
        .split(",")
        .map(t => t.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);

    let themeFiles: string[];
    if (userThemeList.length > 0) {
        themeFiles = userThemeList.map(name => {
            const theme = allThemes.find(t => 
                t.fileName === name || 
                t.name === name || 
                t.fileName === `${name}.css` || 
                t.fileName.replace(/\.css$/i, "") === name
            );
            return theme?.fileName;
        }).filter(Boolean) as string[];
    } else {
        themeFiles = allThemes.map(t => t.fileName);
    }

    const includeQuickCss = settings.store.includeQuickCss;
    const cycleList = [...themeFiles];
    if (includeQuickCss) {
        cycleList.push("QUICK_CSS");
    }

    if (cycleList.length === 0) return;

    const currentEnabledThemes = Settings.enabledThemes;
    const isQuickCssEnabled = Settings.useQuickCss;

    let currentIndex = -1;
    if (includeQuickCss && isQuickCssEnabled) {
        currentIndex = cycleList.indexOf("QUICK_CSS");
    } else {
        currentIndex = cycleList.findIndex(name => currentEnabledThemes.includes(name));
    }

    const nextIndex = (currentIndex + 1) % cycleList.length;
    const nextTheme = cycleList[nextIndex];

    if (nextTheme === "QUICK_CSS") {
        Settings.enabledThemes = [];
        Settings.useQuickCss = true;
    } else {
        Settings.useQuickCss = false;
        Settings.enabledThemes = [nextTheme];
    }
}

function onKeydown(e: KeyboardEvent) {
    if (e.altKey && e.code === "KeyQ") {
        e.preventDefault();
        cycleTheme();
    }
}

function ChatBarThemeSwitcherButton(props: ChatBarProps) {
    const { showChatButton } = settings.use(["showChatButton"]);
    if (!showChatButton) return null;

    return (
        <ChatBarButton
            tooltip="Cycle Theme"
            onClick={cycleTheme}
        >
            <ThemeSwitcherIcon />
        </ChatBarButton>
    );
}

export default definePlugin({
    name: "ThemeSwitcher",
    description: "Instantly switch between themes with a button in the chat bar or Alt+Q",
    authors: [Devs.SupremeMuhit],
    dependencies: ["ChatInputButtonAPI"],
    settings,

    start() {
        document.addEventListener("keydown", onKeydown);
    },

    stop() {
        document.removeEventListener("keydown", onKeydown);
    },

    chatBarButton: {
        render: ChatBarThemeSwitcherButton,
        icon: ThemeSwitcherIcon
    }
});
