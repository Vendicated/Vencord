/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { CogWheel, DeleteIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { AddonCard } from "@components/settings/AddonCard";
import { UserThemeHeader } from "@main/themes";
import { openInviteModal } from "@utils/discord";
import { showToast } from "@webpack/common";

import { openThemeSettingsModal } from "./ThemeSettingsModal";

interface ThemeCardProps {
    theme: UserThemeHeader;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    onDelete: () => void;
}

export function ThemeCard({ theme, enabled, onChange, onDelete }: ThemeCardProps) {
    return (
        <AddonCard
            name={theme.name}
            description={theme.description}
            author={theme.author}
            enabled={enabled}
            setEnabled={onChange}
            infoButton={
                <>
                    {theme.properties.length > 0 && (
                        <button
                            className="vc-plugins-info-button"
                            onClick={() => openThemeSettingsModal(theme)}
                        >
                            <CogWheel />
                        </button>
                    )}
                    {IS_WEB && (
                        <div style={{ cursor: "pointer", color: "var(--status-danger" }} onClick={onDelete}>
                            <DeleteIcon />
                        </div>
                    )}
                </>
            }
            footer={
                <Flex flexDirection="row" gap="0.2em">
                    {!!theme.website && <Link href={theme.website}>Website</Link>}
                    {!!(theme.website && theme.invite) && " • "}
                    {!!theme.invite && (
                        <Link
                            href={`https://discord.gg/${theme.invite}`}
                            onClick={async e => {
                                e.preventDefault();
                                theme.invite != null && openInviteModal(theme.invite).catch(() => showToast("Invalid or expired invite"));
                            }}
                        >
                            Discord Server
                        </Link>
                    )}
                </Flex>
            }
        />
    );
}
