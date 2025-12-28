/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import type { Channel, User } from "@vencord/discord-types";
import { React } from "@webpack/common";
import type { ReactElement, ReactNode } from "react";

interface UserContextProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

function getStringLabel(label: any): string | null {
    if (typeof label === "string") return label;

    const maybeChildren = label?.props?.children;
    if (typeof maybeChildren === "string") return maybeChildren;

    return null;
}

function getNodeLabel(node: ReactElement<any>): string | null {
    const props = (node as any).props as any;
    return getStringLabel(props?.label)
        ?? getStringLabel(props?.children);
}

function isInviteToServerRoot(node: ReactElement<any>): boolean {
    const props = (node as any).props as any;
    const id = String(props?.id ?? "").toLowerCase();
    const label = getNodeLabel(node)?.toLowerCase();

    if (id.includes("invite") && id.includes("server")) return true;
    if (id.includes("invite-to-server")) return true;

    if (id.includes("invite") && hasRenderableChildren(node) && !id.includes("activity") && !id.includes("listen")) return true;

    return label === "invite to server";
}

function hasRenderableChildren(node: ReactElement<any>): boolean {
    const ch = ((node as any).props as any)?.children;
    if (ch == null) return false;
    if (Array.isArray(ch)) return ch.length > 0;
    return true;
}

function ConfirmInviteModal(props: {
    rootProps: ModalProps;
    close(): void;
    userLabel: string;
    serverLabel: string;
    onConfirm(): void;
}) {
    const { rootProps, close, userLabel, serverLabel, onConfirm } = props;

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader>
                <Heading>Invite '{userLabel}' to '{serverLabel}'</Heading>
            </ModalHeader>

            <ModalContent>
                <Paragraph>
                    Are you sure you want to invite <strong>{userLabel}</strong> to <strong>{serverLabel}</strong>?
                </Paragraph>
            </ModalContent>

            <ModalFooter>
                <Flex>
                    <Button
                        variant="dangerPrimary"
                        onClick={close}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            close();
                            onConfirm();
                        }}
                    >
                        Invite
                    </Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}

function wrapInviteActionsInPlace(
    nodes: Array<ReactElement<any> | null | undefined>,
    opts: {
        userLabel: string;
        openConfirm: (serverLabel: string, onConfirm: () => void) => void;
    },
    state: {
        inInviteSubtree: boolean;
    }
) {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node == null) continue;

        if (Array.isArray(node)) {
            wrapInviteActionsInPlace(node as any, opts, state);
            continue;
        }

        if (!React.isValidElement(node)) continue;

        const el = node as ReactElement<any>;
        const props = (el as any).props as any;

        const becomesInviteSubtree = state.inInviteSubtree || isInviteToServerRoot(el);

        let nextChildren: ReactNode = props?.children;
        if (nextChildren != null) {
            const arr = Array.isArray(nextChildren) ? nextChildren : [nextChildren];
            const mutable = arr.slice() as Array<ReactElement<any> | null | undefined>;

            wrapInviteActionsInPlace(mutable, opts, { inInviteSubtree: becomesInviteSubtree });

            const changed = mutable.some((v, idx) => v !== arr[idx]);
            if (changed) {
                nextChildren = Array.isArray(nextChildren) ? mutable : mutable[0];
            }
        }

        const action = props?.action;
        const shouldWrapAction =
            becomesInviteSubtree &&
            typeof action === "function" &&
            !isInviteToServerRoot(el);

        if (shouldWrapAction) {
            const serverLabel = getNodeLabel(el) ?? "this server";

            const wrapped = React.cloneElement(el as any, {
                children: nextChildren as any,
                action: () => opts.openConfirm(serverLabel, () => action()),
            } as any);

            nodes[i] = wrapped;
        } else if (nextChildren !== props?.children) {
            nodes[i] = React.cloneElement(el as any, { children: nextChildren as any } as any);
        }
    }
}

const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user) return;

    const userLabel = user.globalName || user.username || "this user";

    const openConfirm = (serverLabel: string, onConfirm: () => void) => {
        const key = openModal(modalProps => (
            <ConfirmInviteModal
                rootProps={modalProps}
                close={() => closeModal(key)}
                userLabel={userLabel}
                serverLabel={serverLabel}
                onConfirm={onConfirm}
            />
        ));
    };

    wrapInviteActionsInPlace(children as any, { userLabel, openConfirm }, { inInviteSubtree: false });
};

export default definePlugin({
    name: "ConfirmInviteToServer",
    authors: [Devs.Aqxorus],
    description: "Shows a confirmation modal before inviting a user to a server, preventing accidental invites.",
    contextMenus: {
        "user-context": UserContextMenuPatch,
    },
});
