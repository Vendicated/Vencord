import { definePluginSettings } from "@api/Settings";
import { addProfileBadge, BadgePosition, removeProfileBadge, type ProfileBadge } from "@api/Badges";
import definePlugin, { OptionType } from "@utils/types";
import { React, UserStore } from "@webpack/common";
import type { CSSProperties } from "react";

interface BadgeDef {
    /** key inside `settings.store` that toggles this badge on/off */
    key: string;
    id: string;
    name: string;
    icon: string;
}

// Display order = array order. This is also the order the toggles
// appear in the plugin's settings tab, so the two always match.
const BADGE_ORDER: BadgeDef[] = [
    // Staff
    { key: "showStaff", id: "staff", name: "Discord Staff", icon: "5e74e9b61934fc1f67c65515d1f7e60d" },
    // Nitro: generic badge, then tiers lowest -> highest (Bronze -> Opal)
    { key: "showNitrobasic", id: "premium_tenure_basic", name: "Discord Nitro Basic", icon: "f61ddf640d11d9bdfaf9de265eb862edf28986b659e545f293b54adf229433af" },
    { key: "showNitro1mo",  id: "premium_tenure_1_month_v2",  name: "Nitro (1mo)",  icon: "4f33c4a9c64ce221936bd256c356f91f" },
    { key: "showNitro3mo",  id: "premium_tenure_3_month_v2",  name: "Nitro (3mo)",  icon: "4514fab914bdbfb4ad2fa23df76121a6" },
    { key: "showNitro6mo",  id: "premium_tenure_6_month_v2",  name: "Nitro (6mo)",  icon: "2895086c18d5531d499862e41d1155a6" },
    { key: "showNitro12mo", id: "premium_tenure_12_month_v2", name: "Nitro (12mo)", icon: "0334688279c8359120922938dcb1d6f8" },
    { key: "showNitro24mo", id: "premium_tenure_24_month_v2", name: "Nitro (24mo)", icon: "0d61871f72bb9a33a7ae568c1fb4f20a" },
    { key: "showNitro36mo", id: "premium_tenure_36_month_v2", name: "Nitro (36mo)", icon: "11e2d339068b55d3a506cff34d3780f3" },
    { key: "showNitro60mo", id: "premium_tenure_60_month_v2", name: "Nitro (60mo)", icon: "cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4" },
    { key: "showNitro72mo", id: "premium_tenure_72_month_v2", name: "Nitro (72mo+)", icon: "5b154df19c53dce2af92c9b61e6be5e2" },
    // Partnered Server Owner, Moderator Programs Alumni
    { key: "showPartner", id: "partner", name: "Partnered Server Owner", icon: "3f9748e53446a137a052f3454e2de41e" },
    { key: "showCertifiedMod", id: "certified_moderator", name: "Moderator Programs Alumni", icon: "fee1624003e2fee35cb398e125dc479b" },
    // HypeSquad Events, then the houses
    { key: "showHypesquadEvents", id: "hypesquad", name: "HypeSquad Events", icon: "bf01d1073931f921909045f3a39fd264" },
    { key: "showHypesquadBravery", id: "hypesquad_house_1", name: "HypeSquad Bravery", icon: "8a88d63823d8a71cd5e390baa45efa02" },
    { key: "showHypesquadBalance", id: "hypesquad_house_3", name: "HypeSquad Balance", icon: "3aa41de486fa12454c3761e8e223442e" },
    { key: "showHypesquadBrilliance", id: "hypesquad_house_2", name: "HypeSquad Brilliance", icon: "011940fd013da3f7fb926e4a1cd2e618" },
    // Bug Hunter
    { key: "showBugHunterTier1", id: "bug_hunter_level_1", name: "Discord Bug Hunter", icon: "2717692c7dca7289b35297368a940dd0" },
    { key: "showBugHunterTier2", id: "bug_hunter_level_2", name: "Bug Hunter Tier 2", icon: "848f79194d4be5ff5f81505cbd0ce1e6" },
    // Early Verified Bot Developer, Early Supporter
    { key: "showEarlyVerifiedBotDev", id: "verified_developer", name: "Early Verified Bot Developer", icon: "6df5892e0f35b051f8b61eace34f4967" },
    { key: "showEarlySupporter", id: "early_supporter", name: "Early Supporter", icon: "7060786766c9c840eb3019e725d2b358" },
    // Server Boost (lowest -> highest)
    { key: "showBoostLvl1", id: "guild_booster_lvl1", name: "Server Boost (1mo)",  icon: "51040c70d4f20a921ad6674ff86fc95c" },
    { key: "showBoostLvl2", id: "guild_booster_lvl2", name: "Server Boost (2mo)",  icon: "0e4080d1d333bc7ad29ef6528b6f2fb7" },
    { key: "showBoostLvl3", id: "guild_booster_lvl3", name: "Server Boost (3mo)",  icon: "72bed924410c304dbe3d00a6e593ff59" },
    { key: "showBoostLvl4", id: "guild_booster_lvl4", name: "Server Boost (6mo)",  icon: "df199d2050d3ed4ebf84d64ae83989f8" },
    { key: "showBoostLvl5", id: "guild_booster_lvl5", name: "Server Boost (9mo)",  icon: "996b3e870e8a22ce519b3a50e6bdd52f" },
    { key: "showBoostLvl6", id: "guild_booster_lvl6", name: "Server Boost (12mo)", icon: "991c9f39ee33d7537d9f408c3e53141e" },
    { key: "showBoostLvl7", id: "guild_booster_lvl7", name: "Server Boost (15mo)", icon: "cb3ae83c15e970e8f3d410bc62cb8b99" },
    { key: "showBoostLvl8", id: "guild_booster_lvl8", name: "Server Boost (18mo)", icon: "7142225d31238f6387d9f09efaa02759" },
    { key: "showBoostLvl9", id: "guild_boost_lvl24", name: "Server Boost (2 Years)", icon: "ec92202290b48d0879b7413d2dde3bab" },
    // Originally Known As, Quest, Orbs
    { key: "showOriginallyKnownAs", id: "legacy_username", name: "Originally Known As", icon: "6de6d34650760ba5551a79732e98ed60" },
    { key: "showCompletedQuest", id: "quest_completed", name: "Completed a Quest", icon: "7d9ae358c8c5e118768335dbe68b4fb8" },
    { key: "showOrbsApprentice", id: "orb_profile_badge", name: "Orbs Apprentice", icon: "83d8a1eb09a8d64e59233eec5d4d5c2d" },
    // Gifting (lowest -> highest)
    { key: "showPatron",   id: "patron",   name: "Patron",   icon: "ac305d1b9481f312ce4419e7f8296558" },
    { key: "showChampion", id: "champion", name: "Champion", icon: "8b7792c4f65953d3ff564f23429cb79e" },
    { key: "showLuminary", id: "luminary", name: "Luminary", icon: "3119f5504b2cd09576a323908c7c3517" },
    { key: "showIcon",     id: "icon",     name: "Icon",     icon: "64f2413c9b9803661322aaad25826b62" },
    { key: "showHero",     id: "hero",     name: "Hero",     icon: "77d65b1f210014a11eb1582ee06ab684" },
    { key: "showLegend",   id: "legend",   name: "Legend",   icon: "7fe346cfc5da1340087d8759a9e7a395" },
    // Real position not known yet - kept after the known ones
    { key: "showActiveDeveloper", id: "active_developer", name: "Active Developer", icon: "6bdc42827a38498929a4920da12695d9" },
    { key: "showAutomod", id: "automod", name: "Uses AutoMod", icon: "f2459b691ac7453ed6039bbcfaccbfcd" },
    { key: "showBotCommands", id: "bot_commands", name: "Supports Commands", icon: "6f9e37f9029ff57aef81db857890005e" },
    { key: "showAppPremium", id: "application_guild_subscription", name: "App Premium", icon: "d2010c413a8da2208b7e4f35bd8cd4ac" },
    // It seems the April fools one does not show up. I commented it out
    // { key: "showAprilFoolsLootbox", id: "lootbox", name: "April Fools Lootbox", icon: "971cfe4aa5c0582000ea" },
    // Account Age
    { key: "showSeed1y",          id: "seed-1y",          name: "Seed (1y)",          icon: "dda73966211a0c16533f8fcd9f1f27c27a628ef562927270e79df9b9c5e6cb12" },
    { key: "showSprout2y",        id: "sprout-2y",        name: "Sprout (2y)",        icon: "74e1884f930b0d69986f92aeea77d3ff3d3d00c540f386b63e6ebb382d5e927d" },
    { key: "showBud3y",           id: "bud-3y",           name: "Bud (3y)",           icon: "217dab12dcb72d4c95f2863e9dddd5c42003345a001684ea55a736172f32eea1" },
    { key: "showSapling4y",       id: "sapling-4y",       name: "Sapling (4y)",       icon: "26b89419a4f562ab31a1a72eac04833aa1026af937f1d53c088ec258df3db84b" },
    { key: "showBlossom5y",       id: "blossom-5y",       name: "Blossom (5y)",       icon: "1db184b6d10a61a37dc30efdc74d587560fac5291c8bb329977e93bb5a312602" },
    { key: "showRedwood6y",       id: "redwood-6y",       name: "Redwood (6y)",       icon: "6b0f2ed5be272942eeabea3a0289027d164c7b1ce6a76166d1c928a57db762c5" },
    { key: "showSequoia7y",       id: "sequoia-7y",       name: "Sequoia (7y)",       icon: "c095e3e73591843a22dc979d1fcfe3d6cf6841d1f51387d208d19f8bed01deb7" },
    { key: "showBristlecone8y",   id: "bristlecone-8y",   name: "Bristlecone (8y)",   icon: "867feeff5acd481c80bae557c586718fb5390bbaaa1cbde55fae296a7884e799" },
    { key: "showStromatolite9y",  id: "stromatolite-9y",  name: "Stromatolite (9y)",  icon: "a6f4c487be2aa012f41f1fba40e664f914ede9251f4b967d890ab5c065a29fb7" },
    { key: "showPrimordial10y",   id: "primordial-10y",   name: "Primordial (10y)",   icon: "1d8caace0299b12bcc469c35ce927e838abd9c645a22fe7c556f4394e57fa79b" },
    // Streaming
    { key: "showStreamingNewcomer",   id: "streaming-newcomer",   name: "Streaming Newcomer",   icon: "c56b451e3bf04181182c2529e9bd3659e569ea80f582858090007f0752401b38" },
    { key: "showStreamingFledgling",  id: "streaming-fledgling",  name: "Streaming Fledgling",  icon: "2e25ba794f6f371ea0f52eb2d3c8fb2b04094a56f388515e13a9bd6d7949a018" },
    { key: "showStreamingBreakout",   id: "streaming-breakout",   name: "Streaming Breakout",   icon: "4e847b4dca20fbf1c56d3a47cac3c9204f02113c9d5a270ebebdf12909c75848" },
    { key: "showStreamingStandout",   id: "streaming-standout",   name: "Streaming Standout",   icon: "27d0e6939f13dcf113243fc9eac642b15e9764ad891e06c5ed78d45a17678582" },
    { key: "showStreamingTrendsetter",id: "streaming-trendsetter",name: "Streaming Trendsetter",icon: "af681483be2035f14b0f2bfe2e25a8944c97149172938888ca1008edbe037aad" },
    { key: "showStreamingHeadliner",  id: "streaming-headliner",  name: "Streaming Headliner",  icon: "e69a0c86a476c9782ea1d3e7b5ba308eec3d9d6a3eae6ab8af3180f67d16b468" },
    { key: "showStreamingStar",       id: "streaming-star",       name: "Streaming Star",       icon: "06b6206db966635cf626651bdb94eacce5a23ab05dc7f600f7d31aa482b2058c" },
    { key: "showStreamingSensation",  id: "streaming-sensation",  name: "Streaming Sensation",  icon: "1a3b9120ecd64c342083c37980b225d29ebf4544da6ab546c9268f87904c9dfe" },
    { key: "showStreamingVisionary",  id: "streaming-visionary",  name: "Streaming Visionary",  icon: "85f714b90ed3ceb1e00e1f2069bf3ebd564962fa940c92540061537a045e54ab" },
    { key: "showStreamingPhenomenon", id: "streaming-phenomenon", name: "Streaming Phenomenon", icon: "61331d04b7a9542b38bfa59583360c0b9b93c6496a04f99c0ab37fa1d83ec58a" },
    // Game Time
    { key: "showGameTimeCasual",       id: "game-time-casual",       name: "Game Time Casual",       icon: "b75fcc4dd1c65dfd4169a203e21023453fd6fe853c9b5c1fd839781fda98e80d" },
    { key: "showGameTimeRecreational", id: "game-time-recreational", name: "Game Time Recreational", icon: "f0f32cb2a0003475e443b76a7a2baf454356953ecb84195c7a08c3ce2fd95b70" },
    { key: "showGameTimeDedicated",    id: "game-time-dedicated",    name: "Game Time Dedicated",    icon: "e0c82f41bcad94a2a52713800fbef7687d0d2c6a6066b09d5e5876156d086e1a" },
    { key: "showGameTimeCommitted",    id: "game-time-committed",    name: "Game Time Committed",    icon: "16f2aeb7465c99efce4d67d9333e3ddcf7435d6e60d2f5f93dc0c07bc7c5a69b" },
    { key: "showGameTimeSerious",      id: "game-time-serious",      name: "Game Time Serious",      icon: "ba26e83fa68189b41837184e38706f41c288dd29ffba266035d1a5ad9adbae22" },
    { key: "showGameTimeDevoted",      id: "game-time-devoted",      name: "Game Time Devoted",      icon: "851b194288f1913ece6c8d99976519e48210580d6f42d994f21e37801611ad54" },
    { key: "showGameTimeSeasoned",     id: "game-time-seasoned",     name: "Game Time Seasoned",     icon: "8b10f5c0c30abbd521be5afc2e0dd4ec6da18bfbc689f06d93a51d06577cd84a" },
    { key: "showGameTimeIronclad",     id: "game-time-ironclad",     name: "Game Time Ironclad",     icon: "d705628490898f2cc22d669cf8b415bc03fed1ddaf98a2a8cbd97442a509293c" },
    { key: "showGameTimeUnshakeable",  id: "game-time-unshakeable",  name: "Game Time Unshakeable",  icon: "2bddcbc9f9959dab805eb7196c8112ce9dc68b09766c8193ab499b1870e44ac7" },
    { key: "showGameTimeEternal",      id: "game-time-eternal",      name: "Game Time Eternal",      icon: "457ce4e657f0ced23197891cc3d75b7de29cafa065cdb8cbb81060ac0e63b07f" },
    // Game Variety
    { key: "showGameVarietySampler",     id: "game-variety-sampler",     name: "Game Variety Sampler",     icon: "ed18d5976c01a4ea19f5a13af08f0547582405cbe48b098b0822e352b8e0a822" },
    { key: "showGameVarietyDabbler",     id: "game-variety-dabbler",     name: "Game Variety Dabbler",     icon: "e450d5279537db06ee47a104af520b884adaa7ffc3ef2627157526bf1c58e840" },
    { key: "showGameVarietyEnthusiast",  id: "game-variety-enthusiast",  name: "Game Variety Enthusiast",  icon: "158a9d91b8ca9e96d4afeee38cd640fc51483a8196edb9af0c26e44727acafae" },
    { key: "showGameVarietyRanger",      id: "game-variety-ranger",      name: "Game Variety Ranger",      icon: "9e491942070007f64011ae4fc478926b96433698c07621fc43bafdd5efe83912" },
    { key: "showGameVarietyExplorer",    id: "game-variety-explorer",    name: "Game Variety Explorer",    icon: "e25fc55814262150e154ddb1a2b55fc5ed8ed5ba2ff1a22a33d4a41e651e370a" },
    { key: "showGameVarietyAdventurer",  id: "game-variety-adventurer",  name: "Game Variety Adventurer",  icon: "542d5277e0001ea738d5eb57b247dcab9ce6e0c29493d5892203f6258fde55b9" },
    { key: "showGameVarietyVoyager",     id: "game-variety-voyager",     name: "Game Variety Voyager",     icon: "082e693cb9ce98b81af618978d449409efc6522b061bc0eac6e88a949fd888c6" },
    { key: "showGameVarietyMaverick",    id: "game-variety-maverick",    name: "Game Variety Maverick",    icon: "6fc242e9e8259c471a5e4599cd09af5476e622a572ff235883173913bf506103" },
    { key: "showGameVarietyPolymath",    id: "game-variety-polymath",    name: "Game Variety Polymath",    icon: "be9a4d119b8e0d7fc1df7e5a12081332637cb9c978a90377cb9c930500b2fbe6" },
    { key: "showGameVarietyUniversalist",id: "game-variety-universalist",name: "Game Variety Universalist",icon: "fcc34d343451505c642f3397cec2669a2de3a4a410fb968f794b3a1a0dcd1728" },
];

// These newer badges use Discord's /assets/content/<hash>.svg assets rather
// than the standard /badge-icons/<hash>.png badge CDN path.
const SVG_BADGE_IDS = new Set(
    BADGE_ORDER
    .filter(({ id }) => id === "premium_tenure_basic" || /^(seed-|sprout-|bud-|sapling-|blossom-|redwood-|sequoia-|bristlecone-|stromatolite-|primordial-|streaming-|game-time-|game-variety-)/.test(id))
    .map(({ id }) => id)
);

// - Settings UI
// Every badge still has its own boolean in `settings.store` (so your saved
// toggles keep working), but those booleans are hidden from Vencord's default
// list. Instead we render ONE custom component that groups the badges into
// categories, with the badge icon next to each name.

const CATEGORIES: { title: string; match: (id: string) => boolean }[] = [
    { title: "Staff & Programs", match: id => ["staff", "certified_moderator", "verified_developer", "bug_hunter_level_1", "bug_hunter_level_2"].includes(id) },
    { title: "Nitro", match: id => id.startsWith("premium_tenure") },
    { title: "Community & Ownership", match: id => id === "partner" },
    { title: "HypeSquad", match: id => id === "hypesquad" || id.startsWith("hypesquad_") },
    { title: "Server Boost", match: id => id.startsWith("guild_boost") },
    { title: "Gifting", match: id => ["patron", "champion", "luminary", "icon", "hero", "legend"].includes(id) },
    { title: "Legacy / Historical", match: id => ["early_supporter", "legacy_username"].includes(id) },
    { title: "Activity & Engagement", match: id => ["quest_completed", "orb_profile_badge", "active_developer"].includes(id) },
    { title: "Bot / App Features", match: id => ["automod", "bot_commands", "application_guild_subscription"].includes(id) },
    { title: "Account Age", match: id => /^(seed|sprout|bud|sapling|blossom|redwood|sequoia|bristlecone|stromatolite|primordial)-/.test(id) },
    { title: "Streaming", match: id => id.startsWith("streaming-") },
    { title: "Game Time", match: id => id.startsWith("game-time-") },
    { title: "Game Variety", match: id => id.startsWith("game-variety-") },
];

// Badges are grouped, but inside each group they keep BADGE_ORDER order.
const GROUPS = (() => {
    const groups = CATEGORIES.map(c => ({ title: c.title, badges: [] as BadgeDef[] }));
    const other = { title: "Other", badges: [] as BadgeDef[] };
    for (const b of BADGE_ORDER) {
        const idx = CATEGORIES.findIndex(c => c.match(b.id));
        (idx === -1 ? other : groups[idx]).badges.push(b);
    }
    return [...groups, other].filter(g => g.badges.length > 0);
})();

function badgeIconUrl(b: BadgeDef): string {
    return SVG_BADGE_IDS.has(b.id)
    ? `https://cdn.discordapp.com/assets/content/${b.icon}.svg`
    : `https://cdn.discordapp.com/badge-icons/${b.icon}.png`;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void; }) {
    return (
        <div
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        style={{
            width: 40, height: 22, borderRadius: 11, flexShrink: 0, cursor: "pointer",
            position: "relative", transition: "background .15s",
            background: on ? "var(--brand-500, #5865f2)" : "var(--background-modifier-accent, #4e5058)",
        }}
        >
        <div style={{
            position: "absolute", top: 3, left: on ? 21 : 3, width: 16, height: 16,
            borderRadius: "50%", background: "#fff", transition: "left .15s",
        }} />
        </div>
    );
}

const smallBtn: CSSProperties = {
    cursor: "pointer", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 12,
    color: "var(--text-normal, #fff)", background: "var(--background-modifier-hover, #4e5058)",
};

function BadgeSettings() {
    // settings.use() re-renders this component whenever one of the toggles changes
    const store = settings.use(BADGE_ORDER.map(b => b.key)) as Record<string, any>;
    const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

    const set = (key: string, value: boolean) => { (settings.store as any)[key] = value; };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {GROUPS.map(group => {
            const enabled = group.badges.filter(b => store[b.key]).length;
            const isClosed = !!collapsed[group.title];
            return (
                <div key={group.title} style={{
                    border: "1px solid var(--background-modifier-accent, #4e5058)",
                    borderRadius: 8, overflow: "hidden",
                }}>
                <div
                onClick={() => setCollapsed(c => ({ ...c, [group.title]: !c[group.title] }))}
                style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", cursor: "pointer",
                    background: "var(--background-secondary, #2b2d31)",
                }}
                >
                <span style={{ width: 12, color: "var(--text-muted, #949ba4)" }}>{isClosed ? "▸" : "▾"}</span>
                <span style={{ fontWeight: 700, fontSize: 15, flex: 1, color: "var(--header-primary, #fff)" }}>
                {group.title}
                <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8, color: "var(--text-muted, #949ba4)" }}>
                {enabled}/{group.badges.length}
                </span>
                </span>
                <button style={smallBtn} onClick={e => { e.stopPropagation(); group.badges.forEach(b => set(b.key, true)); }}>All on</button>
                <button style={smallBtn} onClick={e => { e.stopPropagation(); group.badges.forEach(b => set(b.key, false)); }}>All off</button>
                </div>

                {!isClosed && group.badges.map(b => (
                    <div key={b.key} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
                        borderTop: "1px solid var(--background-modifier-accent, #4e5058)",
                    }}>
                    {/* background-image keeps the preview as a plain CSS background */}
                        <div style={{
                            width: 28, height: 28, flexShrink: 0,
                            backgroundImage: `url(${badgeIconUrl(b)})`,
                                                     backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center",
                        }} />
                        <span style={{ flex: 1, color: "var(--text-normal, #dbdee1)" }}>{b.name}</span>
                        <Toggle on={!!store[b.key]} onChange={v => set(b.key, v)} />
                        </div>
                ))}
                </div>
            );
        })}
        </div>
    );
}

// Build the settings object dynamically from BADGE_ORDER so the toggle
// list in the UI can never drift out of sync with the badge list itself.
const settingsDef: Record<string, any> = {};
settingsDef.badgeList = {
    type: OptionType.COMPONENT,
    component: BadgeSettings,
};
for (const b of BADGE_ORDER) {
    settingsDef[b.key] = {
        type: OptionType.BOOLEAN,
        description: b.name,
        default: false,
        hidden: true, // shown by the BadgeSettings component instead
    };
}

const settings = definePluginSettings(settingsDef);

// Everything goes through Vencord's Badge API: no store patching, no DOM access.
// Only the current user gets the badges (client-side only).
const customBadges: ProfileBadge = {
    id: "custombadger-badges",
    position: BadgePosition.START,
    getBadges: ({ userId }) => {
        if (userId !== UserStore.getCurrentUser()?.id) return [];

        return BADGE_ORDER
            .filter(badge => settings.store[badge.key])
            .map(badge => ({
                id: badge.id,
                description: badge.name,
                iconSrc: badgeIconUrl(badge),
            }));
    },
};

export default definePlugin({
    name: "CustomBadges",
    description: "Adds chosen badges in your own profile (client-side only), with an on/off switch for each one in the settings tab. Made by (Aperture) Nexus",
    authors: [
        { name: "ApertureNexus", id: 393576016968417290n },
        { name: "Contributor", id: 837022217002680350n },
    ],
    settings,

    start() {
        addProfileBadge(customBadges);
    },

    stop() {
        removeProfileBadge(customBadges);
    },
});
