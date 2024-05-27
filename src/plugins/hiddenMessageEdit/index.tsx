import definePlugin from "../../utils/types";
import {
    NavContextMenuPatchCallback,
    findGroupChildrenByChildId,
} from "../../api/ContextMenu";
import type { Channel, Message } from "discord-types/general";
import {
    Menu,
    UserStore,
    Forms,
    Button,
    Flex,
    React,
    ReactDOM,
} from "../../webpack/common";
import "./styles.css";
import { HiddenMessageEditIcon } from "./icons";
import { getToken } from "./utils";

interface MessageContextProps {
    channel: Channel;
    guildId?: string;
    message: Message;
}

const HiddenMessageEditForm = ({ message, onSave }) => {
    const [newContent, setNewContent] = React.useState(message.content);

    const handleSave = () => {
        onSave(newContent);
    };

    return (
        <div className="hidden-message-edit-form-wrapper">
            <Forms.FormSection className="hidden-message-edit-form">
                <Forms.FormTitle className="hidden-message-edit-title">
                    Hidden Message Edit
                </Forms.FormTitle>
                <Forms.FormText
                    type={Forms.FormText.Types.DESCRIPTION}
                    className="hidden-message-edit-description"
                >
                    Use the cutest hidden message editing feature
                </Forms.FormText>
                <Flex className="inputContainer" align={Flex.Align.CENTER}>
                    <input
                        type="text"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Enter new message content"
                        className="hidden-message-edit-input"
                        style={{ flex: 1, marginRight: "10px" }}
                    />
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.SMALL}
                        onClick={handleSave}
                        className="hidden-message-edit-button"
                    >
                        Save
                    </Button>
                </Flex>
                <Forms.FormText
                    type={Forms.FormText.Types.DESCRIPTION}
                    className="hidden-message-edit-note"
                >
                    NOTE: If too much time passes, you won't be able to modify
                    the message as it will be sent as a new message.
                </Forms.FormText>
            </Forms.FormSection>
        </div>
    );
};

const MessageContextMenuPatch: NavContextMenuPatchCallback = (
    children,
    { channel, message }: MessageContextProps
) => {
    const currentUser = UserStore.getCurrentUser();

    if (!message || !currentUser || message.author.id !== currentUser.id) {
        return;
    }

    let menuGroup = findGroupChildrenByChildId("delete", children);
    if (!menuGroup) {
        menuGroup = findGroupChildrenByChildId("copy-message-link", children);
    }

    const handleEditClick = () => {
        const overlay = document.createElement("div");
        overlay.className = "hidden-message-edit-overlay";

        const formContainer = document.createElement("div");
        formContainer.className = "hidden-message-edit-form-container";

        const closeOverlay = () => {
            document.body.removeChild(overlay);
        };

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeOverlay();
            }
        });

        document.addEventListener(
            "keydown",
            (e) => {
                if (e.key === "Escape") {
                    closeOverlay();
                }
            },
            { once: true }
        );

        overlay.appendChild(formContainer);
        document.body.appendChild(overlay);

        const handleSave = async (newContent: string) => {
            closeOverlay();

            const token = getToken();
            if (!token) {
                return;
            }

            try {
                const response = await fetch(
                    `https://discord.com/api/v9/channels/${channel.id}/messages`,
                    {
                        method: "POST",
                        headers: {
                            accept: "*/*",
                            "accept-language": "en-GB",
                            authorization: token,
                            "content-type": "application/json",
                        },
                        body: JSON.stringify({
                            content: newContent,
                            nonce: message.id,
                            tts: false,
                            flags: 0,
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to edit message");
                }

                const data = await response.json();
            } catch (error) {
                throw error;
            }
        };

        ReactDOM.render(
            <HiddenMessageEditForm message={message} onSave={handleSave} />,
            formContainer
        );
    };

    if (!menuGroup) {
        children.push(
            <Menu.MenuItem
                id="vc-hidden-message-edit"
                label="Hidden Message Edit"
                action={handleEditClick}
                icon={HiddenMessageEditIcon}
            />
        );
    } else {
        menuGroup.push(
            <Menu.MenuItem
                id="vc-hidden-message-edit"
                label="Hidden Message Edit"
                action={handleEditClick}
                icon={HiddenMessageEditIcon}
            />
        );
    }
};

export default definePlugin({
    name: "HiddenMessageEdit",
    authors: [{ id: 390884143749136386n, name: "Prism" }],
    description:
        "Adds a 'Hidden Message Edit' option to your message context menu.",
    contextMenus: {
        message: MessageContextMenuPatch,
    },
    patches: [
        {
            find: "r.default.getToken",
            replacement: [
                {
                    match: /,\s*(\w+)\s*=\s*r\.default\.getToken\(\);/,
                    replace: `, $1 = (webpackChunkdiscord_app.push([[''], {}, e => {m = []; for (let c in e.c) m.push(e.c[c])}], m).find(m => m?.exports?.default?.getToken !== void 0).exports.default.getToken());`,
                },
            ],
        },
    ],
});
