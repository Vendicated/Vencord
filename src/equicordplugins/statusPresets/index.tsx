/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import { proxyLazy } from "@utils/lazy";
import { openModalLazy } from "@utils/modal";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { extractAndLoadChunksLazy, findComponentByCodeLazy, findModuleId, wreq } from "@webpack";
import { Menu, OverridePremiumTypeStore, Toasts } from "@webpack/common";

interface Emoji {
    animated: boolean;
    id: string | null;
    name: string;
}

interface DiscordStatus {
    emojiInfo: Emoji | null;
    text: string;
    clearAfter: "TODAY" | number | null;
}

const PMenu = findComponentByCodeLazy("#{intl::MORE_OPTIONS}", ",renderSubmenu:");
const EmojiComponent = findComponentByCodeLazy(/\.translateSurrogatesToInlineEmoji\(\i\.name\);/);

const CustomStatusSettings = getUserSettingLazy("status", "customStatus")!;
const StatusModule = proxyLazy(() => {
    const id = findModuleId("#{intl::SAVE}", '"custom-status-input"', '"Invalid custom status clear timeout"),');
    return wreq(Number(id));
});

const requireCustomStatusModal = extractAndLoadChunksLazy(["action:\"PRESS_ADD_CUSTOM_STATUS\"", /\i\.\i\i\)/]);

const openCustomStatusModalLazy = () => openModalLazy(async () => {
    await requireCustomStatusModal();
    const key = Object.keys(StatusModule)[0];
    const Component = StatusModule[key];
    return props => <Component {...props} />;
});

function getExpirationMs(expiration: "TODAY" | number) {
    if (expiration !== "TODAY") return Date.now() + expiration;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
}

function setStatus(status: DiscordStatus) {
    CustomStatusSettings.updateSetting({
        text: status.text.trim(),
        expiresAtMs: status.clearAfter != null ? String(getExpirationMs(status.clearAfter)) : "0",
        emojiId: status.emojiInfo?.id ?? "0",
        emojiName: status.emojiInfo?.name ?? "",
        createdAtMs: String(Date.now())
    });
}

const StatusSubMenuComponent = () => {
    const premiumType = OverridePremiumTypeStore.getState().premiumTypeActual ?? 0;
    const update = useForceUpdater();

    return (
        <Menu.Menu navId="sp-custom-status-submenu" onClose={() => { }}>
            {Object.entries((settings.store.StatusPresets as { [k: string]: DiscordStatus | undefined; })).map(([index, status]) =>
                status != null ? (
                    <Menu.MenuItem
                        key={"status-presets-" + index}
                        id={"status-presets-" + index}
                        label={status.text}
                        action={() => (status.emojiInfo?.id == null || premiumType > 0) && setStatus(status)}
                        icon={status.emojiInfo != null
                            ? () => <EmojiComponent emoji={status.emojiInfo} animate={false} hideTooltip={false} />
                            : undefined
                        }
                        disabled={status.emojiInfo?.id != null && premiumType === 0}
                    >
                        <Menu.MenuItem
                            id={"status-presets-delete-" + index}
                            label="Delete Preset"
                            action={() => {
                                const newPresets = JSON.parse(JSON.stringify(settings.store.StatusPresets));
                                delete newPresets[status.text];
                                settings.store.StatusPresets = newPresets;
                                update();
                            }}
                        />
                    </Menu.MenuItem>
                ) : null
            )}
        </Menu.Menu>
    );
};

const settings = definePluginSettings({
    StatusPresets: {
        type: OptionType.COMPONENT,
        description: "Status Presets",
        component: () => <></>,
        default: {}
    }
});

export default definePlugin({
    name: "StatusPresets",
    description: "Allows you to remember your statuses and set them later",
    tags: ["Activity", "Utility"],
    authors: [EquicordDevs.iamme],
    settings,
    dependencies: ["UserSettingsAPI"],
    patches: [
        {
            find: '="custom-status-input";',
            replacement: {
                match: /(?<=\[(\i).{0,6}\.useState\(\i\?\.state\?\?""\),\[(\i).{0,25}\?\?null\),\[(\i).*?)\{text:\i\.\i\.\i\(\i\.\i#{intl::SAVE}\)/,
                replace: "$self.renderRememberButton({text:$1,emojiInfo:$2,clearAfter:$3}),$&"
            }
        },
        {
            find: "#{intl::STATUS_MENU_LABEL}",
            replacement: {
                match: /(,\{onClose:\i\}\))\]/,
                replace: "$1,$self.render()]"
            }
        },
        {
            find: "#{intl::MORE_OPTIONS}),...",
            replacement: {
                match: /\i:\(\)=>\i,(?=.*?function (\i).{0,100}renderSubmenu:\i,ref:)/,
                replace: "$&PMenu:()=>$1,"
            }
        },
    ],

    render() {
        const status = CustomStatusSettings.getSetting();
        return (
            <ErrorBoundary>
                <div />
                {status == null ?
                    <PMenu
                        id="sp-custom/presets-status"
                        action="PRESS_SET_STATUS"
                        onClick={openCustomStatusModalLazy}
                        icon={() => <div />}
                        label="Set Custom Status"
                        renderSubmenu={StatusSubMenuComponent}
                    />
                    :
                    <PMenu
                        id="sp-edit/presets-status"
                        action="PRESS_EDIT_CUSTOM_STATUS"
                        onClick={openCustomStatusModalLazy}
                        icon={() => status.emoji != null ? (
                            <EmojiComponent emoji={status.emoji} animate={false} hideTooltip={false} />
                        ) : null}
                        label="Edit Custom Status"
                        renderSubmenu={StatusSubMenuComponent}
                    />
                }
            </ErrorBoundary>
        );
    },
    renderRememberButton(status: DiscordStatus) {
        return {
            text: "Keep",
            style: { marginLeft: "20px" },
            onClick: () => {
                settings.store.StatusPresets[status.text] = status;
                Toasts.show({
                    message: "Successfully Saved Status",
                    type: Toasts.Type.SUCCESS,
                    id: Toasts.genId()
                });
            }
        };
    },
    startAt: StartAt.WebpackReady
});
