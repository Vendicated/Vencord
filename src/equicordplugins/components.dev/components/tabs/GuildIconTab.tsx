/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GuildIcon, GuildIconSizes, GuildStore, ManaButton, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function GuildIconTab() {
    const [animate, setAnimate] = useState(true);

    const guilds = Object.values(GuildStore.getGuilds()).slice(0, 6);
    const guildWithIcon = guilds.find(g => g.icon);
    const guildWithoutIcon = guilds.find(g => !g.icon) ?? guilds[0];

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Controls">
                <div className="vc-compfinder-grid">
                    <ManaButton
                        variant="secondary"
                        text={`Animate: ${animate}`}
                        onClick={() => setAnimate(a => !a)}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Icon Sizes">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    GuildIcon component with various sizes. Shows server icon or acronym fallback.
                </Paragraph>
                <div className="vc-compfinder-grid" style={{ alignItems: "flex-end" }}>
                    {guildWithIcon && GuildIconSizes.map(size => (
                        <div key={size} style={{ textAlign: "center" }}>
                            <GuildIcon
                                guildId={guildWithIcon.id}
                                guildName={guildWithIcon.name}
                                guildIcon={guildWithIcon.icon ?? null}
                                iconSize={size}
                                animate={animate}
                            />
                            <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                                {size}px
                            </Paragraph>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Acronym Fallback">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    When a guild has no icon, displays an acronym based on the guild name.
                </Paragraph>
                <div className="vc-compfinder-grid" style={{ alignItems: "flex-end" }}>
                    {[32, 48, 80].map(size => (
                        <div key={size} style={{ textAlign: "center" }}>
                            <GuildIcon
                                guildId={guildWithoutIcon?.id ?? "0"}
                                guildName={guildWithoutIcon?.name ?? "Test Guild"}
                                guildIcon={null}
                                iconSize={size}
                            />
                            <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                                {size}px (no icon)
                            </Paragraph>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Your Guilds">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Showing icons from guilds you're in.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    {guilds.map(guild => (
                        <div key={guild.id} style={{ textAlign: "center", maxWidth: 80 }}>
                            <GuildIcon
                                guildId={guild.id}
                                guildName={guild.name}
                                guildIcon={guild.icon ?? null}
                                iconSize={48}
                                animate={animate}
                            />
                            <Paragraph color="text-muted" style={{ fontSize: 10, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {guild.name.slice(0, 12)}
                            </Paragraph>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• guildId - The guild's snowflake ID</Paragraph>
                <Paragraph color="text-muted">• guildName - Guild name (used for acronym fallback)</Paragraph>
                <Paragraph color="text-muted">• guildIcon - Icon hash or null</Paragraph>
                <Paragraph color="text-muted">• iconSize - Size in pixels</Paragraph>
                <Paragraph color="text-muted">• animate - Enable animated icons (GIF)</Paragraph>
                <Paragraph color="text-muted">• className - Custom CSS class</Paragraph>
                <Paragraph color="text-muted">• acronymClassName - Class for acronym text</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Import">
                <Paragraph color="text-muted">
                    {"import { GuildIcon } from \"@equicordplugins/components.dev/components\";"}
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
