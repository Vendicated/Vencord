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
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, Menu, Text } from "@webpack/common";

const debug = false;

enum ResponseType {
    Success,
    Error,
}

interface SuccessResponse {
    kind: ResponseType.Success;
    id: string;
}

interface ErrorResponse {
    kind: ResponseType.Error;
    message: string;
}

// Create a new case on phish.report
async function startTakedownFetch(url: string, apiBase: string, apiKey: string): Promise<SuccessResponse | ErrorResponse> {
    if (debug) {
        return {
            kind: ResponseType.Success,
            id: "1234",
        };
    }

    let response: Response;
    try {
        response = await fetch(apiBase + "/api/v0/cases", {
            method: "POST",
            headers: {
                "authorization": "Bearer " + apiKey,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                url,
                ignore_duplicates: false,
            }),
        });
    } catch (e) {
        return {
            kind: ResponseType.Error,
            message: "Failed to connect to phish.report via proxy.",
        };
    }

    let data: any;
    try {
        data = await response.json();
    } catch (e) {
        return {
            kind: ResponseType.Error,
            message: `Failed to parse the response from phish.report, got HTTP status code: ${response.status}`,
        };
    }

    if (response.ok) {
        data.kind = ResponseType.Success;
        return data;
    } else {
        if (!data.message) {
            data.message = `Failed to report the phishing link. HTTP status code: ${response.status}`;
        }

        data.kind = ResponseType.Error;
        return data;
    }
}

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

            <ModalFooter>
                {footer && footer(props)}
            </ModalFooter>
        </ModalRoot>
    );
}

function showMissingApiKeyModal() {
    // TODO - make the modal have a button that brings you to the settings page
    basicModal("API Key Required", "You need to provide an API key within the settings of this plugin in order to report phishing links.", props => (
        <Button
            color={Button.Colors.PRIMARY}
            onClick={props.onClose}
        >
            Close
        </Button>
    ));
}

async function showErrorModal(message: string) {
    basicModal("Error", message, props => (
        <Button
            color={Button.Colors.PRIMARY}
            onClick={props.onClose}
        >
            Close
        </Button>
    ));
}

async function startTakedown(url: string, apiBase: string, apiKey: string) {
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
    const result = await startTakedownFetch(newUrl, apiBase, apiKey);
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
                size={Button.Sizes.SMALL}
                color={Button.Colors.LINK}
            >
                View Case
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
                startTakedown(src, settings.store.apiBase, settings.store.apiKey);
            }}
        />
    ));
};

const settings = definePluginSettings({
    apiBase: {
        description: "Base URL for the phish.report API (without leading slash)",
        type: OptionType.STRING,
        default: "https://stefan-phishreport-70.deno.dev",
        restartNeeded: false,
    },
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
