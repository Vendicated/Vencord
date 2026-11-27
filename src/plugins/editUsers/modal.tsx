/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Heading } from "@components/Heading";
import { Button, Divider, ErrorBoundary, Flex, FormSwitch, Paragraph } from "@components/index";
import { classNameFactory } from "@utils/css";
import { saveFile } from "@utils/web";
import { RenderModalProps, User } from "@vencord/discord-types";
import { extractAndLoadChunksLazy } from "@webpack";
import { ColorPicker, DisplayProfileUtils, IconUtils, Modal, NavigationRouter, openModalLazy, Select, showToast, TabBar, TextInput, useEffect, useLayoutEffect, useRef, useState } from "@webpack/common";

import { CosmeticsEditor } from "./cosmetics";
import { emptyOverride, getUserOverride, hasFlag, logger, OverrideFlags, saveUserOverride, UserOverride, UserTag } from "./data";
import { exportImages, getImages, ImageChanges, ImageKind, imageTypes, importImages, saveImageChanges, UserImages, validateImage } from "./images";

const cl = classNameFactory("vc-editUsers-");
const requireColorPicker = extractAndLoadChunksLazy(['type:"USER_SETTINGS_MODAL_OPEN"']);

const tabs = [
    { id: "name", label: "Display Name" },
    { id: "avatar", label: "Avatar" },
    { id: "banner", label: "Banner" },
    { id: "profile", label: "Profile" },
] as const;

type Tab = typeof tabs[number]["id"];

const guildOptions = {
    name: [OverrideFlags.DisableNicks, OverrideFlags.PreferServerNicks, "nicknames"],
    avatar: [OverrideFlags.DisableServerAvatars, OverrideFlags.KeepServerAvatar, "avatars"],
    banner: [OverrideFlags.DisableServerBanners, OverrideFlags.KeepServerBanner, "banners"],
} as const;

const tagOptions = [
    { label: "Default", value: "" },
    { label: "App", value: "BOT" },
    { label: "Official", value: "OFFICIAL" },
    { label: "Server", value: "SERVER" },
    { label: "Original Poster", value: "ORIGINAL_POSTER" },
    { label: "Hide tag", value: "NONE" },
] satisfies { label: string; value: UserTag; }[];

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function FileButton({ label, accept, disabled, onSelect }: {
    label: string;
    accept: string;
    disabled?: boolean;
    onSelect(file: File): void;
}) {
    const input = useRef<HTMLInputElement>(null);
    return (
        <>
            <Button variant="secondary" disabled={disabled} onClick={() => input.current?.click()}>
                {label}
            </Button>
            <input
                ref={input}
                type="file"
                accept={accept}
                hidden
                onChange={({ currentTarget }) => {
                    const file = currentTarget.files?.[0];
                    currentTarget.value = "";
                    if (file) {
                        onSelect(file);
                    }
                }}
            />
        </>
    );
}

function ColorField({ label, value, disabled, onChange }: {
    label: string;
    value: string;
    disabled: boolean;
    onChange(value: string): void;
}) {
    const parsed = value ? Number.parseInt(value, 16) : null;
    const color = parsed != null && !Number.isNaN(parsed) ? parsed : null;

    return (
        <section className={cl("section")}>
            <Heading>{label}</Heading>
            <div className={cl("colourRow")}>
                <div className={cl("colourPicker", disabled && "disabled")}>
                    <ErrorBoundary noop={false}>
                        <ColorPicker
                            color={color}
                            showEyeDropper
                            onChange={next => {
                                if (!disabled && next != null) {
                                    onChange(next.toString(16).padStart(6, "0"));
                                }
                            }}
                        />
                    </ErrorBoundary>
                </div>
                <Paragraph size="sm" className={cl("colourValue", !value && "description")}>
                    {value ? `#${value.toUpperCase()}` : "Default"}
                </Paragraph>
                <Button variant="secondary" disabled={disabled || !value} onClick={() => onChange("")}>
                    Reset Colour
                </Button>
            </div>
        </section>
    );
}

function ImageEditor({ kind, image, url, placeholder, fallbackColor, onFile, onUrl, onReset, disabled }: {
    kind: ImageKind;
    image?: Blob;
    url: string;
    placeholder?: string;
    fallbackColor?: string;
    onFile(file: File): void;
    onUrl(url: string): void;
    onReset(): void;
    disabled: boolean;
}) {
    const [preview, setPreview] = useState<{ blob: Blob; src: string; }>();
    useLayoutEffect(() => {
        if (!image) {
            setPreview(undefined);
            return;
        }
        const src = URL.createObjectURL(image);
        setPreview({ blob: image, src });
        return () => URL.revokeObjectURL(src);
    }, [image]);

    const src = image
        ? (preview?.blob === image ? preview.src : undefined)
        : url.trim() || placeholder;
    const buttons = (
        <Flex gap="8px">
            <FileButton label="Choose Image" accept={imageTypes} disabled={disabled} onSelect={onFile} />
            <Button variant="secondary" disabled={disabled || (!image && !url)} onClick={onReset}>
                Reset Image
            </Button>
        </Flex>
    );

    return (
        <section className={cl("section")}>
            <Heading>{kind === "avatar" ? "Avatar Image" : "Banner Image"}</Heading>
            {kind === "avatar" ? (
                <div className={cl("avatarRow")}>
                    {src && <img key={src} src={src} className={cl("preview", "avatar")} alt="avatar preview" />}
                    {buttons}
                </div>
            ) : (
                <>
                    {src ? (
                        <img key={src} src={src} className={cl("preview", "banner")} alt="banner preview" />
                    ) : fallbackColor ? (
                        <div className={cl("preview", "banner")} style={{ backgroundColor: `#${fallbackColor}` }} />
                    ) : null}
                    {buttons}
                </>
            )}
            <TextInput
                aria-label={`${kind} image URL`}
                placeholder={`Optional ${kind} URL`}
                value={url}
                disabled={disabled || Boolean(image)}
                onChange={onUrl}
            />
        </section>
    );
}

function EditModal({ user, modalProps }: { user: User; modalProps: RenderModalProps; }) {
    const original = useRef(getUserOverride(user.id));
    const [override, setOverride] = useState(() => ({ ...emptyOverride, ...original.current }));
    const [tab, setTab] = useState<Tab>("name");
    const [images, setImages] = useState<UserImages>({});
    const [changes, setChanges] = useState<ImageChanges>({});
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState<{ tab?: Tab; message: string; }>();

    useEffect(() => {
        let closed = false;
        getImages(user.id)
            .then(saved => {
                if (!closed) {
                    setImages(saved ?? {});
                }
            })
            .catch(error => {
                logger.error("Could not load user images", error);
                if (!closed) {
                    setError({ message: errorMessage(error) });
                }
            })
            .finally(() => {
                if (!closed) {
                    setBusy(false);
                }
            });

        return () => { closed = true; };
    }, [user.id]);

    const setField = <K extends keyof UserOverride,>(key: K, value: UserOverride[K]) =>
        setOverride(override => ({ ...override, [key]: value }));

    function toggleFlag(flag: OverrideFlags, enabled: boolean) {
        setOverride(override => ({
            ...override,
            flags: enabled ? override.flags | flag : override.flags & ~flag
        }));
    }

    async function selectImage(kind: ImageKind, file: File) {
        setBusy(true);
        setError(undefined);
        try {
            await validateImage(file);
            setChanges(changes => ({ ...changes, [kind]: file }));
            setField(kind === "avatar" ? "avatarUrl" : "bannerUrl", "");
        } catch (error) {
            setError({ tab: kind, message: errorMessage(error) });
        } finally {
            setBusy(false);
        }
    }

    async function save() {
        const next = { ...override };
        for (const key of ["username", "pronouns", "avatarUrl", "bannerUrl"] as const) {
            next[key] = next[key].trim();
        }

        for (const kind of ["avatar", "banner"] as const) {
            const key = kind === "avatar" ? "avatarUrl" : "bannerUrl";
            const url = next[key];
            if (url && url !== original.current[key] && !/^https?:\/\//i.test(url)) {
                setError({ tab: kind, message: "Image URLs must start with http:// or https://." });
                setTab(kind);
                return false;
            }
        }

        setBusy(true);
        setError(undefined);
        try {
            if (Object.keys(changes).length) {
                await saveImageChanges(new Map([[user.id, changes]]));
            }

            saveUserOverride(user.id, next);
            modalProps.onClose();
            showToast({ text: "User edits saved.", variant: "success" });
            return true;
        } catch (error) {
            logger.error("Could not save user edits", error);
            setError({ message: errorMessage(error) });
            return false;
        } finally {
            setBusy(false);
        }
    }

    function renderTab() {
        switch (tab) {
            case "name":
                return (
                    <>
                        <section className={cl("section")}>
                            <Heading>Display Name</Heading>
                            <TextInput
                                aria-label="Display name"
                                placeholder={user.globalName || user.username}
                                value={override.username}
                                onChange={value => setField("username", value)}
                            />
                        </section>
                        <ColorField
                            label="Username Colour"
                            value={override.usernameColor}
                            disabled={busy}
                            onChange={value => setField("usernameColor", value)}
                        />
                        <FormSwitch
                            title="Override server role colours"
                            description="Use the custom username colour even when the user has a coloured role."
                            disabled={!override.usernameColor}
                            value={hasFlag(override.flags, OverrideFlags.OverrideRoleColor)}
                            onChange={value => toggleFlag(OverrideFlags.OverrideRoleColor, value)}
                            hideBorder
                        />
                    </>
                );
            case "avatar":
            case "banner": {
                const urlKey = tab === "avatar" ? "avatarUrl" : "bannerUrl";
                const useDefault = tab === "avatar" && hasFlag(override.flags, OverrideFlags.UseDefaultAvatar);
                const image = changes[tab] === null ? undefined : changes[tab] ?? images[tab];
                let placeholder: string | null | undefined;
                if (!original.current[urlKey]) {
                    placeholder = tab === "avatar"
                        ? user.getAvatarURL()
                        : DisplayProfileUtils.getDisplayProfile(user.id)?.getBannerURL({ canAnimate: true, size: 480 });
                }
                return (
                    <>
                        {useDefault ? (
                            <section className={cl("section")}>
                                <Heading>Avatar Image</Heading>
                                <div className={cl("avatarRow")}>
                                    <img
                                        className={cl("preview", "avatar")}
                                        src={IconUtils.getDefaultAvatarURL(user.id, user.discriminator)}
                                        alt="Default avatar preview"
                                    />
                                    <Paragraph size="sm" className={cl("description")}>
                                        Using Discord's default avatar.
                                    </Paragraph>
                                </div>
                            </section>
                        ) : (
                            <ImageEditor
                                key={tab}
                                kind={tab}
                                image={image}
                                url={override[urlKey]}
                                placeholder={placeholder ?? undefined}
                                fallbackColor={tab === "banner" ? override.bannerColor : undefined}
                                disabled={busy}
                                onFile={file => selectImage(tab, file)}
                                onUrl={value => setField(urlKey, value)}
                                onReset={() => {
                                    setChanges(changes => ({ ...changes, [tab]: null }));
                                    setField(urlKey, "");
                                    setError(undefined);
                                }}
                            />
                        )}
                        {tab === "avatar" ? (
                            <FormSwitch
                                title="Use Discord’s default avatar"
                                description="Show the default Discord avatar for this user in every server and DM."
                                disabled={busy}
                                value={useDefault}
                                onChange={value => {
                                    toggleFlag(OverrideFlags.UseDefaultAvatar, value);
                                    setError(undefined);
                                }}
                                hideBorder
                            />
                        ) : (
                            <ColorField
                                label="Banner Colour"
                                value={override.bannerColor}
                                disabled={busy}
                                onChange={value => setField("bannerColor", value)}
                            />
                        )}
                    </>
                );
            }
            case "profile":
                return (
                    <>
                        <section className={cl("section")}>
                            <Heading>Pronouns</Heading>
                            <TextInput
                                aria-label="Pronouns"
                                placeholder="Enter pronouns"
                                value={override.pronouns}
                                onChange={value => setField("pronouns", value)}
                            />
                        </section>
                        <Divider />
                        <ErrorBoundary noop={false}>
                            <CosmeticsEditor
                                cosmetics={override}
                                onSelect={setField}
                                onError={message => setError(message ? { tab: "profile", message } : undefined)}
                                onOpenShop={async () => {
                                    if (await save()) {
                                        NavigationRouter.transitionTo("/shop");
                                    }
                                }}
                                busy={busy}
                                onBusy={setBusy}
                            />
                        </ErrorBoundary>
                        <Divider />
                        <section className={cl("section")}>
                            <Heading>Message Tag</Heading>
                            <Select
                                options={tagOptions}
                                serialize={String}
                                select={tag => setField("tag", tag)}
                                isSelected={tag => tag === override.tag}
                                placeholder="Message tag"
                                closeOnSelect
                            />
                        </section>
                    </>
                );
        }
    }

    const guildOption = tab === "profile" ? undefined : guildOptions[tab];
    const disableGuildOptions = tab === "avatar" && hasFlag(override.flags, OverrideFlags.UseDefaultAvatar);
    const notice = error && (!error.tab || error.tab === tab)
        ? { message: error.message, type: "critical", role: "alert" }
        : undefined;

    return (
        <Modal
            {...modalProps}
            title={`Edit User ${user.username}`}
            size="lg"
            notice={notice}
            input={
                <TabBar
                    type="top"
                    look="brand"
                    className={cl("tabBar")}
                    selectedItem={tab}
                    onItemSelect={setTab}
                >
                    {tabs.map(({ id, label }) => (
                        <TabBar.Item id={id} key={id} className={cl("tab")}>
                            {label}
                        </TabBar.Item>
                    ))}
                </TabBar>
            }
            actions={[
                {
                    text: "Reset All",
                    variant: "critical-primary",
                    disabled: busy,
                    onClick: () => {
                        setOverride({ ...emptyOverride });
                        setChanges({ avatar: null, banner: null });
                        setError(undefined);
                    }
                },
                {
                    text: "Save",
                    variant: "primary",
                    disabled: busy,
                    onClick: save
                }
            ]}
        >
            <div className={cl("modal")}>
                {renderTab()}
                {guildOption && (
                    <>
                        <Divider />
                        <div className={cl("switches")}>
                            <FormSwitch
                                title={`Hide server ${guildOption[2]}`}
                                disabled={disableGuildOptions}
                                value={hasFlag(override.flags, guildOption[0])}
                                onChange={value => toggleFlag(guildOption[0], value)}
                            />
                            <FormSwitch
                                title={`Prefer server ${guildOption[2]} over the override`}
                                disabled={disableGuildOptions || hasFlag(override.flags, guildOption[0])}
                                value={hasFlag(override.flags, guildOption[1])}
                                onChange={value => toggleFlag(guildOption[1], value)}
                                hideBorder
                            />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}

const SafeEditModal = ErrorBoundary.wrap(EditModal, { noop: false });

export function openUserEditModal(user: User) {
    try {
        openModalLazy(async () => {
            await requireColorPicker().catch(error => logger.error("Could not load colour picker", error));
            return modalProps => <SafeEditModal user={user} modalProps={modalProps} />;
        });
    } catch (error) {
        logger.error("Could not open edit modal", error);
    }
}

export function ImageBackup() {
    const [busy, setBusy] = useState(false);

    async function run(action: () => Promise<void>) {
        setBusy(true);
        try {
            await action();
        } catch (error) {
            logger.error("Image backup failed", error);
            showToast({ text: errorMessage(error), variant: "critical" });
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={cl("backup")}>
            <Paragraph>Back up local avatars and banners. Import replaces matching images by user ID.</Paragraph>
            <Flex>
                <FileButton
                    label="Import Images"
                    accept=".json,application/json"
                    disabled={busy}
                    onSelect={file => run(async () => {
                        const count = await importImages(file);
                        showToast({ text: `Imported images for ${count} ${count === 1 ? "user" : "users"}.`, variant: "success" });
                    })}
                />
                <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => run(async () => saveFile(await exportImages()))}
                >
                    Export Images
                </Button>
            </Flex>
        </div>
    );
}
