import "./styles.css";

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { findByPropsLazy, findLazy, findStoreLazy } from "@webpack";
import { ChannelStore, Constants, FluxDispatcher, Forms, MessageActions, PermissionsBits, PermissionStore, RestAPI, SearchableSelect, SelectedChannelStore, showToast, SnowflakeUtils, Toasts, useState } from "@webpack/common";

const cl = classNameFactory("vc-gary-");
const CloudUpload = findLazy(m => m.prototype?.trackUploadFinished);
const PendingReplyStore = findStoreLazy("PendingReplyStore");
const { getSlowmodeCooldownGuess } = findByPropsLazy("getSlowmodeCooldownGuess");
const Native = VencordNative.pluginHelpers.RandomGary as PluginNative<typeof import("./native")>;


export function GaryIcon({ height = 30, width = 30, className }: { height?: number; width?: number; className?: string; }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} fill="none" viewBox="0 0 24 24" className={classes(className, cl("icon"))}>
            <path
                fill="currentColor"
                fillRule="evenodd"
                d="M11.75 6.406c-1.48 0-1.628.157-2.394.157C8.718 6.563 6.802 5 5.845 5c-.958 0-2.075.563-2.075 2.188v1.875c.002.492.18 2 .88 1.597-.827.978-.91 2.119-.899 3.223-.223.064-.45.137-.671.212-.684.234-1.41.532-1.737.744a.75.75 0 0 0 .814 1.26c.156-.101.721-.35 1.408-.585l.228-.075c.046.433.161.83.332 1.19l-.024.013c-.41.216-.79.465-1.032.623l-.113.074a.75.75 0 1 0 .814 1.26l.131-.086c.245-.16.559-.365.901-.545.08-.043.157-.081.231-.116C6.763 19.475 9.87 20 11.75 20s4.987-.525 6.717-2.148c.074.035.15.073.231.116.342.18.656.385.901.545l.131.086a.75.75 0 0 0 .814-1.26l-.113-.074a13.008 13.008 0 0 0-1.032-.623l-.024-.013c.171-.36.286-.757.332-1.19l.228.075c.687.235 1.252.484 1.409.585a.75.75 0 0 0 .813-1.26c-.327-.212-1.053-.51-1.736-.744-.221-.075-.449-.148-.672-.213.012-1.104-.072-2.244-.9-3.222.7.403.88-1.105.881-1.598V7.188C19.73 5.563 18.613 5 17.655 5c-.957 0-2.873 1.563-3.51 1.563-.767 0-.915-.157-2.395-.157Zm-.675 9.194c.202-.069.441-.1.675-.1.234 0 .473.031.676.1.1.034.22.088.328.174a.619.619 0 0 1 .246.476c0 .23-.139.39-.246.476-.107.086-.229.14-.328.174-.203.069-.442.1-.676.1-.234 0-.473-.031-.675-.1a1.078 1.078 0 0 1-.329-.174.619.619 0 0 1-.246-.476c0-.23.139-.39.246-.476.107-.086.23-.14.329-.174Zm2.845-3.1c.137-.228.406-.5.81-.5s.674.272.81.5c.142.239.21.527.21.813 0 .285-.068.573-.21.811-.136.229-.406.501-.81.501s-.673-.272-.81-.5a1.596 1.596 0 0 1-.21-.813c0-.285.068-.573.21-.811Zm-5.96 0c.137-.228.406-.5.81-.5s.674.272.81.5c.142.239.21.527.21.813 0 .285-.068.573-.21.811-.136.229-.406.501-.81.501s-.673-.272-.81-.5a1.596 1.596 0 0 1-.21-.813c0-.285.068-.573.21-.811Z"
                clipRule="evenodd"
            />
        </svg>
    );
}

const settings = definePluginSettings({
    randomGarySendMethod: {
        description: "Choose the buttons behavior.",
        type: OptionType.SELECT,
        options: [
            { label: "Left Click: Send as a link, Right Click: Send as an attachment", value: "link", default: true },
            { label: "Left Click: Send as an attachment, Right Click: Send as a link", value: "attachment" }
        ],
    },
    randomGaryImageSource: {
        description: "Choose the source of the image",
        type: OptionType.SELECT,
        options: [
            { label: "Gary API", value: "gary", default: true },
            { label: "Cat API", value: "catapi" },
            { label: "Minker API (attachment only)", value: "minker" },
            { label: "Goober API", value: "goober" }
        ],
    },
});

async function sendGaryLink(channelId: string, link: string) {
    const reply = PendingReplyStore.getPendingReply(channelId);
    if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
    try {
        if (getSlowmodeCooldownGuess(channelId) === 0) {
            const channel = ChannelStore.getChannel(channelId);
            if (channel.guild_id && !PermissionStore.can(PermissionsBits.EMBED_LINKS, channel)) {
                showToast("Missing required permissions to embed links", Toasts.Type.FAILURE);
                return;
            }
            RestAPI.post({
                url: Constants.Endpoints.MESSAGES(channelId),
                body: {
                    channel_id: channelId,
                    content: link,
                    nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                    sticker_ids: [],
                    type: 0,
                    attachments: [],
                    message_reference: reply ? MessageActions.getSendMessageOptionsForReply(reply)?.messageReference : null,
                }
            });

            const cooldownMs = channel.rateLimitPerUser * 1000;

            FluxDispatcher.dispatch({
                type: "SLOWMODE_SET_COOLDOWN",
                channelId,
                slowmodeType: 0,
                cooldownMs
            });
        }
    } catch (error) {
        console.error("Failed to send Gary link:", error);
        showToast("Failed to send Gary image", Toasts.Type.FAILURE);
    }
}

async function uploadGaryImage(url: string, channelId: string) {
    const reply = PendingReplyStore.getPendingReply(channelId);
    if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
    try {
        if (getSlowmodeCooldownGuess(channelId) === 0) {
            const channel = ChannelStore.getChannel(channelId);

            if (channel.guild_id && !PermissionStore.can(PermissionsBits.ATTACH_FILES, channel)) {
                showToast("Missing required permissions to upload files", Toasts.Type.FAILURE);
                return;
            }

            showToast("Uploading image, this may take a few seconds.", Toasts.Type.MESSAGE);
            const buffer = await Native.getImageBuffer(url);
            const blob = new Blob([buffer], { type: "image/jpeg" });
            const file = new File([blob], "gary.jpg", { type: "image/jpeg" });
            const upload = new CloudUpload({
                file,
                isThumbnail: false,
                platform: 1,
            }, channelId, false, 0);

            upload.on("complete", () => {
                RestAPI.post({
                    url: Constants.Endpoints.MESSAGES(channelId),
                    body: {
                        channel_id: channelId,
                        content: "",
                        nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                        sticker_ids: [],
                        type: 0,
                        attachments: [{
                            id: "0",
                            filename: upload.filename,
                            uploaded_filename: upload.uploadedFilename
                        }],
                        message_reference: reply ? MessageActions.getSendMessageOptionsForReply(reply)?.messageReference : null,
                    }
                });

                const cooldownMs = channel.rateLimitPerUser * 1000;

                FluxDispatcher.dispatch({
                    type: "SLOWMODE_SET_COOLDOWN",
                    channelId,
                    slowmodeType: 0,
                    cooldownMs
                });
            });

            upload.on("error", () => showToast("Failed to upload Gary image", Toasts.Type.FAILURE));
            upload.upload();
        }
    } catch (error) {
        console.error("Failed to upload Gary image:", error);
        MessageActions.sendMessage(channelId, { content: "Failed to upload Gary image :(" });
    }
}


function GaryModal({ rootProps }: { rootProps: ModalProps; }) {
    const options = [
        { value: "gary", label: "Gary API" },
        { value: "catapi", label: "Cat API" },
        { value: "minker", label: "Minker API (attachment only)" },
        { value: "goober", label: "Goober API" }
    ];
    const currentValue = settings.use(["randomGaryImageSource"]).randomGaryImageSource;
    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">
                    Button Settings
                </Forms.FormTitle>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent className={cl("modal-content")}>
                <section className={Margins.top16}>
                    <Forms.FormTitle tag="h3">
                        {"Image Source"}
                    </Forms.FormTitle>

                    <SearchableSelect
                        options={options}
                        value={options.find(o => o.value === currentValue)}
                        placeholder={"Select a source"}
                        maxVisibleItems={5}
                        closeOnSelect={true}
                        onChange={v => settings.store.randomGaryImageSource = v}
                    />
                </section>
            </ModalContent>
        </ModalRoot>
    );
}
//@ts-ignore
export const GaryChatBarIcon: ChatBarButton = ({ isMainChat }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const currentChannelId = SelectedChannelStore.getChannelId();

    const handleClick = async (e: React.MouseEvent) => {
        if (e.shiftKey) {
            handleShiftClick();
            return;
        }

        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);

        if (currentChannelId) {
            const link = await getUrl();
            if (settings.store.randomGarySendMethod === "link" && settings.store.randomGaryImageSource !== "minker") {
                await sendGaryLink(currentChannelId, link);
            } else {
                await uploadGaryImage(link, currentChannelId);
            }
        }
    };

    const handleRightClick = async () => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);

        if (currentChannelId) {
            const link = await getUrl();
            if (settings.store.randomGarySendMethod === "attachment" && settings.store.randomGaryImageSource !== "minker") {
                await sendGaryLink(currentChannelId, link);
            } else {
                await uploadGaryImage(link, currentChannelId);
            }
        }
    };

    const handleShiftClick = async () => {

        openModal(props => (
            <GaryModal rootProps={props} />
        ));
    };

    if (!isMainChat) return null;

    let buttonTooltip;
    switch (settings.use(["randomGaryImageSource"]).randomGaryImageSource) {
        case "gary":
            buttonTooltip = "Click for Gary";
            break;
        case "catapi":
            buttonTooltip = "Click for Cat";
            break;
        case "minker":
            buttonTooltip = "Click for Minky";
            break;
        case "goober":
            buttonTooltip = "Click for Goober";
    }

    return (
        <ChatBarButton
            tooltip={buttonTooltip}
            onClick={handleClick}
            onContextMenu={handleRightClick}
            buttonProps={{
                "aria-label": "Gary Button",
                className: classes(cl("chat-button"), isAnimating ? cl("animating") : "")
            }}
        >
            <GaryIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "RandomGary",
    description: "Adds a button to send a random Gary picture!",
    authors:[{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    settings,
    start() {
        VencordNative.csp.requestAddOverride("https://api.garythe.cat", ["img-src", "connect-src"], "RandomGary");
        VencordNative.csp.requestAddOverride("api.garythe.cat", ["img-src", "connect-src"], "RandomGary");
        VencordNative.csp.requestAddOverride("https://api.thecatapi.com", ["img-src", "connect-src"], "RandomGary");
        VencordNative.csp.requestAddOverride("api.thecatapi.com", ["img-src", "connect-src"], "RandomGary");
        VencordNative.csp.requestAddOverride("https://minky.materii.dev", ["img-src", "connect-src"], "RandomGary");
        VencordNative.csp.requestAddOverride("minky.materii.dev", ["img-src", "connect-src"], "RandomGary");
        addChatBarButton("vc-gary", GaryChatBarIcon);
    },
    stop() {
        removeChatBarButton("vc-gary");
    }
});

export async function getUrl() {
    switch (settings.store.randomGaryImageSource) {
        case "gary":
            const response = await fetch("https://api.garythe.cat/gary");
            const json = await response.json();
            return json.url;
        case "goober":
            const gooberResponse = await fetch("https://api.garythe.cat/goober");
            const gooberJson = await gooberResponse.json();
            return gooberJson.url;
        case "catapi":
            const catResponse = await fetch("https://api.thecatapi.com/v1/images/search");
            const catJson = await catResponse.json();
            return catJson[0].url;
        case "minker":
            return "https://minky.materii.dev/";
        default:
            throw new Error("Invalid randomGaryImageSource value");
    }
}


