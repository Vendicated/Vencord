/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { ExpandableSection } from "@components/ExpandableCard";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { IS_LINUX } from "@utils/constants";
import { OptionType } from "@utils/types";
import type { RunningGame } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { React, RunningGameStore, Select, useStateFromStores } from "@webpack/common";

export type Game = Pick<RunningGame, "id" | "exePath" | "name">;

const LocalActivityStore = findStoreLazy("LocalActivityStore");

export function getGameStores() {
    return IS_DISCORD_DESKTOP ? [RunningGameStore] : [RunningGameStore, LocalActivityStore];
}

export function getRunningGames(): readonly Game[] {
    const running = RunningGameStore.getRunningGames();
    if (IS_DISCORD_DESKTOP) return running;

    // Vesktop/arRPC report local playing activities rather than native processes.
    const games: Game[] = [...running];
    for (const activity of LocalActivityStore.getActivities()) {
        if (activity.type !== 0 || !activity.application_id || games.some(game => game.id === activity.application_id)) continue;
        games.push({ id: activity.application_id, name: activity.name, exePath: "" });
    }
    return games;
}

interface Keybind {
    id: string;
}

interface KeybindGroup {
    key: string;
    game?: Game;
    keybinds: Keybind[];
}

export const settings = definePluginSettings({
    linuxCompatibility: {
        type: OptionType.BOOLEAN,
        displayName: "Linux input compatibility",
        description: "Capture global keyboard and mouse shortcuts on Linux/Wayland. Requires official Discord, Python 3 and read access to /dev/input/event*.",
        default: false,
        restartNeeded: true,
        disabled: !(IS_DISCORD_DESKTOP && IS_LINUX)
    },
    gameBindings: {
        type: OptionType.CUSTOM,
        description: "Optional game restrictions for Discord keybinds.",
        default: {} as Record<string, Game | undefined>
    }
});

function gameKey(game: Game) {
    if (game.id) return `id:${game.id}`;
    if (game.exePath) return `path:${game.exePath}`;
    return "";
}

function isRunning(game: Game, runningGames: readonly Game[]) {
    return runningGames.some(running => game.id
        ? running.id === game.id
        : Boolean(game.exePath) && running.exePath === game.exePath);
}

export function isBindingEnabled(id: number, runningGames: readonly Game[]) {
    const game = settings.store.gameBindings[id];
    return !game || isRunning(game, runningGames);
}

export const KeybindGroups = ErrorBoundary.wrap(function KeybindGroups({ keybinds, renderKeybind }: {
    keybinds: Keybind[];
    renderKeybind: (keybind: Keybind) => React.ReactNode;
}) {
    const { gameBindings } = settings.use(["gameBindings"]);
    const runningGames = useStateFromStores(getGameStores(), getRunningGames);
    const grouped = new Map<string, KeybindGroup>();
    const assignments = new Map<string, string>();
    for (const keybind of keybinds) {
        const game = gameBindings[keybind.id];
        const key = game ? gameKey(game) : "";
        let group = grouped.get(key);
        if (!group) {
            group = { key, game, keybinds: [] };
            grouped.set(key, group);
        }
        group.keybinds.push(keybind);
        assignments.set(keybind.id, key);
    }
    const groups = [...grouped.values()].sort((a, b) =>
        Number(Boolean(a.game)) - Number(Boolean(b.game))
        || (a.game?.name ?? "").localeCompare(b.game?.name ?? "")
        || a.key.localeCompare(b.key)
    );
    const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>(() =>
        Object.fromEntries(groups.map(group => [group.key, !group.game || isRunning(group.game, runningGames)]))
    );
    const previousAssignments = React.useRef(assignments);

    // Reveal newly added or reassigned shortcuts, without reopening a group the
    // user collapsed when only a game's running status or a row's action changes.
    React.useEffect(() => {
        const reveal = new Set<string>();
        for (const [id, key] of assignments) {
            if (previousAssignments.current.get(id) !== key) reveal.add(key);
        }
        previousAssignments.current = assignments;
        if (!reveal.size) return;
        setExpandedGroups(current => {
            let next = current;
            for (const key of reveal) {
                if (current[key] !== false) continue;
                if (next === current) next = { ...current };
                next[key] = true;
            }
            return next;
        });
    });

    return (
        <div className="vc-better-keybinds-groups">
            <Paragraph className="vc-better-keybinds-help">
                Assign a game on a keybind to move it into that group.
                {" "}{IS_DISCORD_DESKTOP
                    ? "Missing a game? Launch it and add it under Registered Games."
                    : "Games come from local Rich Presence, such as arRPC. Without game detection, assigned keybinds stay inactive. Browser shortcuts only work while Discord is focused."}
            </Paragraph>
            {groups.map(group => (
                <ExpandableSection
                    key={group.key}
                    className="vc-better-keybinds-group"
                    expanded={expandedGroups[group.key] ?? true}
                    onExpandedChange={expanded => setExpandedGroups(current => ({ ...current, [group.key]: expanded }))}
                    renderContent={() => group.keybinds.map(keybind => (
                        <div key={keybind.id} className="vc-better-keybinds-row">
                            {renderKeybind(keybind)}
                        </div>
                    ))}
                >
                    <div className="vc-better-keybinds-group-heading">
                        <span className="vc-better-keybinds-group-name">{group.game?.name ?? "Global"}</span>
                        <span className="vc-better-keybinds-group-count">
                            {group.keybinds.length} {group.keybinds.length === 1 ? "keybind" : "keybinds"}
                        </span>
                        <span className="vc-better-keybinds-group-status">
                            {!group.game ? "Always available" : isRunning(group.game, runningGames) ? "Running" : "Not running"}
                        </span>
                    </div>
                </ExpandableSection>
            ))}
        </div>
    );
}, { message: "Could not render the BetterKeybinds groups." });

export const GameSelector = ErrorBoundary.wrap(function GameSelector({ keybind }: { keybind: Keybind; }) {
    const { gameBindings } = settings.use(["gameBindings"]);
    const selected = gameBindings[keybind.id];
    const labelId = React.useId();
    const [seenGames, runningGames] = useStateFromStores(getGameStores(), () => [
        RunningGameStore.getGamesSeen(),
        getRunningGames()
    ] as const);
    const games = new Map<string, Game>();
    for (const game of [...seenGames, ...runningGames]) {
        const key = gameKey(game);
        if (key) games.set(key, game);
    }
    // Retain saved choices even if Discord forgets a previously detected game.
    if (selected && !games.has(gameKey(selected))) games.set(gameKey(selected), selected);
    const options = [
        { label: "Global (all games)", value: "" },
        ...Array.from(games, ([value, game]) => ({ label: game.name, value }))
            .sort((a, b) => a.label.localeCompare(b.label))
    ];
    const selectedKey = selected ? gameKey(selected) : "";

    return (
        <div className="vc-better-keybinds-assignment">
            <Heading tag="h5" id={labelId} className="vc-better-keybinds-assignment-label">Group</Heading>
            <Select
                className="vc-better-keybinds-assignment-select"
                aria-labelledby={labelId}
                options={options}
                placeholder="Choose a game"
                maxVisibleItems={5}
                closeOnSelect
                select={value => {
                    const game = games.get(value);
                    if (game) {
                        const { id, name, exePath } = game;
                        settings.store.gameBindings[keybind.id] = { id, name, exePath };
                    } else {
                        delete settings.store.gameBindings[keybind.id];
                    }
                }}
                isSelected={value => value === selectedKey}
                serialize={value => value}
            />
        </div>
    );
}, { message: "Could not render the BetterKeybinds game selector." });
