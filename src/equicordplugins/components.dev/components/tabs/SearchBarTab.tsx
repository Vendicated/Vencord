/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph, SearchBar, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function SearchBarTab() {
    const [query1, setQuery1] = useState("");
    const [query2, setQuery2] = useState("");
    const [query3, setQuery3] = useState("prefilled");

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Default search bar with clear button.
                </Paragraph>
                <SearchBar
                    query={query1}
                    onChange={setQuery1}
                    onClear={() => setQuery1("")}
                    placeholder="Search..."
                />
            </SectionWrapper>

            <SectionWrapper title="Sizes">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Available sizes: sm, md (default).
                </Paragraph>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <SearchBar
                        query={query2}
                        onChange={setQuery2}
                        onClear={() => setQuery2("")}
                        placeholder="Small size"
                        size="sm"
                    />
                    <SearchBar
                        query={query2}
                        onChange={setQuery2}
                        onClear={() => setQuery2("")}
                        placeholder="Medium size"
                        size="md"
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="States">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Disabled and prefilled states.
                </Paragraph>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <SearchBar
                        query=""
                        onChange={() => { }}
                        placeholder="Disabled"
                        disabled
                    />
                    <SearchBar
                        query={query3}
                        onChange={setQuery3}
                        onClear={() => setQuery3("")}
                        placeholder="Prefilled"
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    query, onChange, onClear?, placeholder?, size?, autoFocus?, disabled?, onKeyDown?, onBlur?, onFocus?, autoComplete?, inputProps?, aria-label?
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
