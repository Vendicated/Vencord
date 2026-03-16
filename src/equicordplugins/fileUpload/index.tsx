/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { OpenExternalIcon } from "@components/Icons";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin from "@utils/types";
import { Menu, PermissionsBits, PermissionStore, React, useEffect, useState } from "@webpack/common";

import { settings } from "./settings";
import { serviceLabels, ServiceType } from "./types";
import { getMediaUrl } from "./utils/getMediaUrl";
import { cancelCurrentUpload, getUploadState, subscribeUploadState, uploadFile, uploadPickedFile } from "./utils/upload";

const cl = classNameFactory("vc-file-upload-");

const ProgressBarInner = () => {
    const [state, setState] = useState(getUploadState);

    useEffect(() => subscribeUploadState(() => setState(getUploadState())), []);

    if (state.phase === "idle") {
        return null;
    }

    const percentage = Math.max(0, Math.min(100, state.percent));

    return (
        <div
            className={cl("progress-wrap")}
            data-phase={state.phase}
        >
            <div className={cl("progress-head")}>
                <div className={cl("progress-label")}>
                    {state.status || "Uploading..."}
                </div>
                <div className={cl("progress-meta")}>
                    <span className={cl("progress-attempt")}>
                        {state.attempt > 0 && state.totalAttempts > 0 ? `${state.attempt}/${state.totalAttempts}` : ""}
                    </span>
                    {state.canCancel && (
                        <button
                            className={cl("progress-cancel")}
                            type="button"
                            onClick={cancelCurrentUpload}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
            <div className={cl("progress-track")}>
                <div
                    className={cl("progress-fill")}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className={cl("progress-file")}>
                {state.fileName || ""}{state.currentServiceLabel ? ` • ${state.currentServiceLabel}` : ""}
            </div>
        </div>
    );
};

const ProgressBar = ErrorBoundary.wrap(ProgressBarInner, { noop: true });

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;

    const { itemSrc, itemHref, target } = props;
    const url = getMediaUrl({ src: itemSrc, href: itemHref, target });

    if (!url) return;

    const group = findGroupChildrenByChildId("open-native-link", children)
        ?? findGroupChildrenByChildId("copy-link", children);

    if (group && !group.some(child => child?.props?.id === "file-upload")) {
        const serviceType = settings.store.serviceType as ServiceType;
        const serviceName = serviceLabels[serviceType];

        group.push(
            <Menu.MenuItem
                label={`Upload to ${serviceName}`}
                key="file-upload"
                id="file-upload"
                action={() => uploadFile(url)}
            />
        );
    }
};

const imageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;

    if ("href" in props && !props.src) return;

    const url = getMediaUrl(props);
    if (!url) return;

    if (children.some(child => child?.props?.id === "file-upload-group")) return;

    const serviceType = settings.store.serviceType as ServiceType;
    const serviceName = serviceLabels[serviceType];

    children.push(
        <Menu.MenuGroup id="file-upload-group">
            <Menu.MenuItem
                label={`Upload to ${serviceName}`}
                key="file-upload"
                id="file-upload"
                action={() => uploadFile(url)}
            />
        </Menu.MenuGroup>
    );
};

const ExternalIcon = () => <OpenExternalIcon height={24} width={24} />;

const channelAttachMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const channel = props?.channel;
    if (!channel) return;
    if (channel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel)) return;
    if (children.some(child => child?.props?.id === "file-upload-manual")) return;

    children.splice(1, 0,
        <Menu.MenuItem
            id="file-upload-manual"
            key="file-upload-manual"
            label="Upload to Host"
            iconLeft={ExternalIcon}
            leadingAccessory={{
                type: "icon",
                icon: ExternalIcon
            }}
            action={() => uploadPickedFile()}
        />
    );
};

export default definePlugin({
    name: "FileUpload",
    description: "Upload images and videos to file hosting services like Zipline and Nest",
    authors: [EquicordDevs.creations, EquicordDevs.keircn, Devs.ScattrdBlade],
    settings,
    patches: [
        {
            find: ".CREATE_FORUM_POST||",
            replacement: {
                match: /(textValue:.{0,50}channelId:\i\.id\}\))(?:,\i(,))?/,
                replace: "$1,$self.renderUploadProgress()$2"
            }
        }
    ],
    contextMenus: {
        "message": messageContextMenuPatch,
        "image-context": imageContextMenuPatch,
        "channel-attach": channelAttachMenuPatch
    },
    renderUploadProgress() {
        return <ProgressBar />;
    }
});
