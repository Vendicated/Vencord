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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { Button, Forms, Menu,/* SettingsRouter, */Text } from "@webpack/common";

import { ResponseType } from "./types";

const Native = VencordNative.pluginHelpers.PhishReport as PluginNative<typeof import("./native")>;

async function basicModal(title: string, message: string, footer: ((props: ModalProps) => JSX.Element) | undefined) {
    openModal(props =>
        <ModalRoot
            {...props}
            size={ModalSize.SMALL}
        >
            <ModalHeader separator={false}>
                <Text
                    color="header-primary"
                    variant="heading-lg/semibold"
                    tag="h1"
                    style={{ flexGrow: 1 }}
                >
                    {title}
                </Text>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent>
                <Forms.FormText>
                    {message}
                </Forms.FormText>
            </ModalContent>

            {footer && (
                <ModalFooter>
                    {footer(props)}
                </ModalFooter>
            )}
        </ModalRoot>
    );
}

function showMissingApiKeyModal() {
    basicModal("API Key Required", "You need to provide an API key within the settings of this plugin in order to report phishing links.", props => (
        <>
            <Button
                onClick={() => {
                    // TODO: open the settings page for this plugin
                    // SettingsRouter.open("PhishReportSettings");
                    props.onClose();
                }}
                color={Button.Colors.BRAND}
                look={Button.Looks.FILLED}
            >
                Go to Settings
            </Button>
            <Button
                onClick={props.onClose}
                color={Button.Colors.PRIMARY}
                look={Button.Looks.LINK}
            >
                Close
            </Button>
        </>
    ));
}

async function showErrorModal(message: string) {
    basicModal("Error", message, props => (
        <Button
            color={Button.Colors.BRAND}
            look={Button.Looks.FILLED}
            onClick={props.onClose}
        >
            Close
        </Button>
    ));
}

async function startTakedown(url: string, apiKey: string) {
    // attempt to follow the url, if it's a redirect (bypasses most URL shorteners)
    // this also checks for dead links
    let newUrl = url;
    try {
        const response = await fetch(url, {
            method: "HEAD",
            redirect: "follow",
            mode: "no-cors",
        });
        newUrl = response.url === "" ? url : response.url;
    } catch (e) {
        return showErrorModal("Failed to follow the URL, it might be dead?");
    }

    // create a new case on phish.report
    const result = await Native.sendTakedownRequest(newUrl, apiKey);
    if (result.kind === ResponseType.Error) {
        return showErrorModal(result.message);
    }

    // show a modal with the result
    basicModal("Success", "Successfully reported the phishing link!", props => (
        <>
            <Button
                onClick={() => {
                    window.open(`https://phish.report/cases/${result.id}`, "_blank");
                    props.onClose();
                }}
                color={Button.Colors.BRAND}
            >
                View Case
            </Button>
            <Button
                onClick={props.onClose}
                color={Button.Colors.PRIMARY}
                look={Button.Looks.LINK}
            >
                Close
            </Button>
        </>
    ));
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    // make sure there is an option to copy or open link
    const linkGroup = findGroupChildrenByChildId("copy-native-link", children);
    linkGroup?.push((
        <Menu.MenuItem
            id="phish-report"
            label="Report Phishing Link"
            color="danger"
            action={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();

                // make sure we have provided an API key
                if (!settings.store.apiKey) {
                    showMissingApiKeyModal();
                    return;
                }

                // start the entire process
                const src = props.itemHref ?? props.itemSrc;
                startTakedown(src, settings.store.apiKey);
            }}
        />
    ));
};

const settings = definePluginSettings({
    apiKey: {
        description: "API key for phish.report",
        type: OptionType.STRING,
        restartNeeded: false,
    }
});


export default definePlugin({
    name: "PhishReport",
    description: "Automatically report phishing links to phish.report with a button press.",
    authors: [Devs.stefanuk12],
    settings,
    contextMenus: {
        "message": messageContextMenuPatch
    }
});
