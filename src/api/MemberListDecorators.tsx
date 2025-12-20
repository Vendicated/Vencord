/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Channel, User } from "@vencord/discord-types";
import { JSX } from "react";

interface DecoratorProps {
    type: "guild" | "dm";
    user: User;
    /** only present when this is a DM list item */
    channel: Channel;
    /** only present when this is a guild list item */
    isOwner: boolean;
}

export type MemberListDecoratorFactory = (props: DecoratorProps) => JSX.Element | null;
type OnlyIn = "guilds" | "dms";

export const decoratorsFactories = new Map<string, { render: MemberListDecoratorFactory, onlyIn?: OnlyIn; }>();

export function addMemberListDecorator(identifier: string, render: MemberListDecoratorFactory, onlyIn?: OnlyIn) {
    decoratorsFactories.set(identifier, { render, onlyIn });
}

export function removeMemberListDecorator(identifier: string) {
    decoratorsFactories.delete(identifier);
}

export function __getDecorators(props: DecoratorProps, type: "guild" | "dm"): JSX.Element {
    const decorators = Array.from(
        decoratorsFactories.entries(),
        ([key, { render: Decorator, onlyIn }]) => {
            if ((onlyIn === "guilds" && type !== "guild") || (onlyIn === "dms" && type !== "dm"))
                return null;

            return (
                <ErrorBoundary noop key={key} message={`Failed to render ${key} Member List Decorator`}>
                    <Decorator {...props} type={type} />
                </ErrorBoundary>
            );
        }
    );

    return (
        <div className="vc-member-list-decorators-wrapper">
            {decorators}
        </div>
    );
}
