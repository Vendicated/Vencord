import { classNameFactory } from "@utils/css";
import { RenderModalProps } from "@vencord/discord-types";
import {
    Button,
    Forms,
    ScrollerThin,
    Select,
    Switch,
    TabBar,
    TextInput,
    useMemo,
    useState,
} from "@webpack/common";
import {
    ModalRoot,
    ModalHeader,
    ModalContent,
    ModalFooter,
    ModalSize,
} from "@utils/modal";

import {
    badgeIcon,
    BOOST_TIERS,
    GIFT_BADGES,
    NITRO_TIERS,
    PROFILE_BADGES,
    SPECIAL_BADGES,
    type BoostTier,
    type NitroTier,
} from "../badges";
import {
    DECORATION_COLLECTIONS,
    DECORATION_PRESETS,
    filterDecorations,
    getDecorationPresetPreview,
} from "../decorations";
import {
    getProfile,
    resetProfile,
    setProfile,
    settings as pluginSettings,
    type CustomProfileData,
} from "../settings";
import { applyProfileChanges, toggleBadgeSelection } from "../utils";
import { getRegistryBaseUrl } from "../sharedProfile";
import { ProfileThemePicker } from "./ProfileThemePicker";
import { CustomBadgeEditor } from "./CustomBadgeEditor";
import { ProfileTabEditor } from "./ProfileTabEditor";

const cl = classNameFactory("vc-custom-profile-");

const enum EditorTab {
    Profile = "profile",
    Account = "account",
    Badges = "badges",
    CustomBadges = "custom-badges",
    Decorations = "decorations",
}

interface DraftState extends CustomProfileData {
    customDecorationAsset: string;
}

function buildDraft(): DraftState {
    const profile = getProfile();
    const knownPreset = DECORATION_PRESETS.some(
        (p) => p.asset && p.asset === profile.avatarDecoration,
    );
    return {
        ...profile,
        customDecorationAsset:
            knownPreset || !profile.avatarDecoration
                ? ""
                : profile.avatarDecoration,
    };
}

export function CustomProfileModal({
    modalProps,
}: {
    modalProps: RenderModalProps;
}) {
    const [draft, setDraft] = useState(buildDraft);
    const [activeTab, setActiveTab] = useState(EditorTab.Profile);
    const [decoSearch, setDecoSearch] = useState("");
    const [decoCollection, setDecoCollection] = useState("");

    const filteredDecorations = useMemo(
        () => filterDecorations(decoSearch, decoCollection),
        [decoSearch, decoCollection],
    );

    const collectionOptions = useMemo(
        () => [
            { label: "All collections", value: "" },
            ...DECORATION_COLLECTIONS.map((c) => ({ label: c, value: c })),
        ],
        [],
    );

    const update = (partial: Partial<DraftState>) =>
        setDraft((prev) => ({ ...prev, ...partial }));

    const selectDecoration = (asset: string) =>
        update({
            avatarDecoration: asset,
            customDecorationAsset: "",
            avatarDecorationOverride: true,
        });

    const save = async () => {
        const customAsset = draft.customDecorationAsset.trim();
        const presetAsset = draft.avatarDecoration.trim();
        const decoration = customAsset || presetAsset;
        setProfile({
            customUsername: draft.customUsername.trim(),
            customDisplayName: draft.customDisplayName.trim(),
            selectedBadges: draft.selectedBadges,
            selectedSpecialBadges: draft.selectedSpecialBadges,
            nitroTier: draft.nitroTier,
            giftTier: draft.giftTier,
            boostTier: draft.boostTier,
            avatarDecoration: decoration,
            avatarDecorationOverride: draft.avatarDecorationOverride,
            replaceRealBadges: draft.replaceRealBadges,
            customAccountCreationDate: draft.customAccountCreationDate.trim(),
            customProfilePicture: draft.customProfilePicture.trim(),
            simulateNitro: draft.simulateNitro,
            customBanner: draft.customBanner.trim(),
            customBio: draft.customBio.trim(),
            customPronouns: draft.customPronouns.trim(),
            useProfileTheme: draft.useProfileTheme,
            profileThemePrimary: draft.profileThemePrimary,
            profileThemeAccent: draft.profileThemeAccent,
            customBadges: draft.customBadges,
        });
        await applyProfileChanges();
        modalProps.onClose();
    };

    const onReset = async () => {
        resetProfile();
        await applyProfileChanges();
        setDraft(buildDraft());
    };

    return (
        <ModalRoot
            {...modalProps}
            title="Custom Profile"
            size="md"
            className={cl("modal")}
        >
            <TabBar
                type="top"
                look="brand"
                className={cl("tab-bar")}
                selectedItem={activeTab}
                onItemSelect={setActiveTab}
            >
                <TabBar.Item className={cl("tab")} id={EditorTab.Profile}>
                    Profile
                </TabBar.Item>
                <TabBar.Item className={cl("tab")} id={EditorTab.Account}>
                    Account
                </TabBar.Item>
                <TabBar.Item className={cl("tab")} id={EditorTab.Badges}>
                    Badges
                </TabBar.Item>
                {/* <TabBar.Item className={cl("tab")} id={EditorTab.CustomBadges}>
                    Custom Badges
                </TabBar.Item> */}
                <TabBar.Item className={cl("tab")} id={EditorTab.Decorations}>
                    Decorations
                </TabBar.Item>
            </TabBar>

            <ScrollerThin className={cl("content-scroll")} fade>
                <div className={cl("content")}>
                    {activeTab === EditorTab.Profile && (
                        <ProfileTabEditor draft={draft} onChange={update} />
                    )}

                    {activeTab === EditorTab.Account && (
                        <>
                            <div className={cl("field-grid")}>
                                <div className={cl("input-row")}>
                                    <Forms.FormTitle tag="h5">
                                        Custom Username
                                    </Forms.FormTitle>
                                    <TextInput
                                        value={draft.customUsername}
                                        onChange={(v) =>
                                            update({ customUsername: v })
                                        }
                                        placeholder="Keep real username if empty"
                                    />
                                </div>

                                <div className={cl("input-row")}>
                                    <Forms.FormTitle tag="h5">
                                        Custom Display Name
                                    </Forms.FormTitle>
                                    <TextInput
                                        value={draft.customDisplayName}
                                        onChange={(v) =>
                                            update({ customDisplayName: v })
                                        }
                                        placeholder="Keep real display name if empty"
                                    />
                                </div>
                            </div>

                            <div className={cl("input-row")}>
                                <Forms.FormTitle tag="h5">
                                    Account Creation Date
                                </Forms.FormTitle>
                                <input
                                    type="date"
                                    className={cl("date-input")}
                                    value={draft.customAccountCreationDate}
                                    onChange={(e) =>
                                        update({
                                            customAccountCreationDate:
                                                e.currentTarget.value,
                                        })
                                    }
                                />
                            </div>

                            {/* <div className={cl("section")}>
                                <div className={cl("section-title")}>
                                    Share with friends (Vencord + CustomProfile)
                                </div>
                                <Switch
                                    note="Uploads your username and badges when you Save."
                                    value={pluginSettings.store.sharePublicly}
                                    onChange={(v) => {
                                        pluginSettings.store.sharePublicly = v;
                                    }}
                                >
                                    Share my profile publicly
                                </Switch>
                                <Switch
                                    note="Show other people's shared profiles. Your friend needs this plugin too."
                                    value={
                                        pluginSettings.store
                                            .syncProfilesFromOthers
                                    }
                                    onChange={(v) => {
                                        pluginSettings.store.syncProfilesFromOthers =
                                            v;
                                    }}
                                >
                                    Show others&apos; shared profiles
                                </Switch>
                                <Forms.FormTitle tag="h5">
                                    Registry URL (same for you and friends)
                                </Forms.FormTitle>
                                <TextInput
                                    value={pluginSettings.store.registryBaseUrl}
                                    onChange={(v) => {
                                        pluginSettings.store.registryBaseUrl =
                                            v.trim();
                                    }}
                                    placeholder="https://your-worker.workers.dev"
                                />
                                {!getRegistryBaseUrl() && (
                                    <Forms.FormText
                                        className={cl("share-hint")}
                                    >
                                        Deploy the free worker in the plugin
                                        registry folder, paste the URL above,
                                        and give the same URL to your friend in
                                        their CustomProfile settings.
                                    </Forms.FormText>
                                )}
                            </div> */}

                            <div className={cl("section")}>
                                <div className={cl("section-title")}>
                                    Profile Theme
                                </div>
                                <Switch
                                    value={draft.useProfileTheme}
                                    onChange={(v) =>
                                        update({ useProfileTheme: v })
                                    }
                                >
                                    Enable profile theme
                                </Switch>
                                {draft.useProfileTheme && (
                                    <ProfileThemePicker
                                        primary={draft.profileThemePrimary}
                                        accent={draft.profileThemeAccent}
                                        onPrimaryChange={(color) =>
                                            update({
                                                profileThemePrimary: color,
                                            })
                                        }
                                        onAccentChange={(color) =>
                                            update({
                                                profileThemeAccent: color,
                                            })
                                        }
                                    />
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === EditorTab.Badges && (
                        <>
                            <div className={cl("switch-row")}>
                                <Switch
                                    note="Hide your real badges locally."
                                    value={draft.replaceRealBadges}
                                    onChange={(v) =>
                                        update({ replaceRealBadges: v })
                                    }
                                >
                                    Replace real badges
                                </Switch>
                            </div>

                            <div className={cl("section")}>
                                <div className={cl("section-title")}>
                                    Badges
                                </div>
                                <div className={cl("grid")}>
                                    {PROFILE_BADGES.map((badge) => (
                                        <div
                                            key={badge.id}
                                            className={`${cl("pill")}${draft.selectedBadges.includes(badge.id) ? " selected" : ""}`}
                                            onClick={() =>
                                                update({
                                                    selectedBadges:
                                                        toggleBadgeSelection(
                                                            draft.selectedBadges,
                                                            badge.id,
                                                            badge.exclusiveGroup,
                                                        ),
                                                })
                                            }
                                            title={badge.description}
                                        >
                                            <img
                                                src={badgeIcon(badge.iconHash)}
                                                alt=""
                                                draggable={false}
                                            />
                                            <span>{badge.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={cl("section")}>
                                <div className={cl("section-title")}>
                                    Evolving Nitro Badge
                                </div>
                                <div className={cl("tier-row")}>
                                    {NITRO_TIERS.map((tier) => (
                                        <div
                                            key={tier.id}
                                            className={`${cl("pill")} ${cl("tier")}${draft.nitroTier === tier.id ? " selected" : ""}`}
                                            onClick={() =>
                                                update({
                                                    nitroTier:
                                                        tier.id as NitroTier,
                                                })
                                            }
                                            title={tier.description}
                                        >
                                            {tier.iconHash && (
                                                <img
                                                    src={badgeIcon(
                                                        tier.iconHash,
                                                    )}
                                                    alt=""
                                                    draggable={false}
                                                />
                                            )}
                                            <span>{tier.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={cl("section")}>
                                <div className={cl("section-title")}>
                                    Special Badges
                                </div>
                                <div className={cl("grid")}>
                                    {SPECIAL_BADGES.map((badge) => (
                                        <div
                                            key={badge.id}
                                            className={`${cl("pill")}${draft.selectedSpecialBadges.includes(badge.id) ? " selected" : ""}`}
                                            onClick={() => {
                                                const selected =
                                                    draft.selectedSpecialBadges.includes(
                                                        badge.id,
                                                    )
                                                        ? draft.selectedSpecialBadges.filter(
                                                              (id) =>
                                                                  id !==
                                                                  badge.id,
                                                          )
                                                        : [
                                                              ...draft.selectedSpecialBadges,
                                                              badge.id,
                                                          ];
                                                update({
                                                    selectedSpecialBadges:
                                                        selected,
                                                });
                                            }}
                                            title={badge.description}
                                        >
                                            <img
                                                src={badgeIcon(badge.iconHash)}
                                                alt=""
                                                draggable={false}
                                            />
                                            <span>{badge.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={cl("section")}>
                                <div className={cl("section-title")}>
                                    Gift Badges
                                </div>
                                <div className={cl("grid")}>
                                    {GIFT_BADGES.map((badge) => (
                                        <div
                                            key={badge.id}
                                            className={`${cl("pill")}${draft.giftTier.includes(badge.id) ? " selected" : ""}`}
                                            onClick={() => {
                                                update({
                                                    giftTier:
                                                        draft.giftTier.includes(
                                                            badge.id,
                                                        )
                                                            ? []
                                                            : [badge.id],
                                                });
                                            }}
                                            title={badge.description}
                                        >
                                            <img
                                                src={badgeIcon(badge.iconHash)}
                                                alt=""
                                                draggable={false}
                                            />
                                            <span>{badge.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={cl("section")}>
                                <div className={cl("section-title")}>
                                    Boost Badge
                                </div>
                                <div className={cl("tier-row")}>
                                    {BOOST_TIERS.map((tier) => (
                                        <div
                                            key={tier.id}
                                            className={`${cl("pill")} ${cl("tier")}${draft.boostTier === tier.id ? " selected" : ""}`}
                                            onClick={() =>
                                                update({
                                                    boostTier:
                                                        tier.id as BoostTier,
                                                })
                                            }
                                            title={tier.description}
                                        >
                                            {tier.iconHash && (
                                                <img
                                                    src={badgeIcon(
                                                        tier.iconHash,
                                                    )}
                                                    alt=""
                                                    draggable={false}
                                                />
                                            )}
                                            <span>{tier.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === EditorTab.CustomBadges && (
                        <CustomBadgeEditor
                            badges={draft.customBadges}
                            onChange={(customBadges) =>
                                update({ customBadges })
                            }
                        />
                    )}

                    {activeTab === EditorTab.Decorations && (
                        <>
                            <div className={cl("section")}>
                                <div className={cl("section-title")}>
                                    Avatar Decoration
                                </div>
                                <div className={cl("deco-filters")}>
                                    <TextInput
                                        value={decoSearch}
                                        onChange={setDecoSearch}
                                        placeholder="Search decorations..."
                                    />
                                    <Select
                                        options={collectionOptions}
                                        isSelected={(v) => v === decoCollection}
                                        select={setDecoCollection}
                                        serialize={(v) => v}
                                    />
                                </div>
                                <div className={cl("deco-count")}>
                                    {filteredDecorations.length} of{" "}
                                    {DECORATION_PRESETS.length - 1} decorations
                                </div>
                                <ScrollerThin className={cl("deco-scroll")}>
                                    <div className={cl("deco-grid")}>
                                        {DECORATION_PRESETS.filter(
                                            (p) => p.id === "none",
                                        ).map((preset) => (
                                            <div
                                                key={preset.id}
                                                className={`${cl("deco")}${draft.avatarDecorationOverride && !draft.avatarDecoration ? " selected" : ""}`}
                                                onClick={() =>
                                                    selectDecoration("")
                                                }
                                                title={preset.name}
                                            >
                                                <span
                                                    className={cl("deco-none")}
                                                >
                                                    None
                                                </span>
                                            </div>
                                        ))}
                                        {filteredDecorations.map((preset) => (
                                            <div
                                                key={preset.asset}
                                                className={`${cl("deco")}${draft.avatarDecoration === preset.asset ? " selected" : ""}`}
                                                onClick={() =>
                                                    selectDecoration(
                                                        preset.asset,
                                                    )
                                                }
                                                title={`${preset.name}${preset.collection ? ` (${preset.collection})` : ""}`}
                                            >
                                                <img
                                                    src={getDecorationPresetPreview(
                                                        preset,
                                                    )}
                                                    alt={preset.name}
                                                    draggable={false}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </ScrollerThin>
                                <div className={cl("input-row")}>
                                    <Forms.FormTitle tag="h5">
                                        Custom Asset ID
                                    </Forms.FormTitle>
                                    <TextInput
                                        value={draft.customDecorationAsset}
                                        onChange={(v) =>
                                            update({
                                                customDecorationAsset: v,
                                                avatarDecoration: v.trim(),
                                                avatarDecorationOverride: true,
                                            })
                                        }
                                        placeholder="a_fed43ab12698df65902ba06727e20c0e"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </ScrollerThin>

            <div className={cl("footer")}>
                <Button onClick={save}>Save</Button>
                <Button
                    color={Button.Colors.RED}
                    look={Button.Looks.FILLED}
                    onClick={onReset}
                >
                    Reset
                </Button>
                <Button look={Button.Looks.LINK} onClick={modalProps.onClose}>
                    Cancel
                </Button>
            </div>
        </ModalRoot>
    );
}
