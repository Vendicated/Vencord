/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { DataStore } from "@api/index";
import { Flex } from "@components/Flex";
import SettingsPlugin from "@plugins/_core/settings";
import { Devs } from "@utils/constants";
import * as Modal from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, React, Text, TextInput } from "@webpack/common";

const loginWithToken = (token: string) => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    const { contentWindow } = iframe;
    if (contentWindow) {
        setInterval(() => {
            contentWindow.localStorage.token = `"${token}"`;
        }, 50);
        setTimeout(() => { location.reload(); }, 2500);
    } else {
        console.error("Failed to access iframe contentWindow");
    }
};

interface Account {
    id: string;
    token: string;
    username: string;
}

class TokenLoginManager {
    public accounts: Record<string, Account> = {};

    async init() {
        const stored = await DataStore.get("tokenLoginManager.data");
        if (stored) {
            this.accounts = stored;
        }
    }

    async save() {
        await DataStore.set("tokenLoginManager.data", this.accounts);
    }

    addAccount(account: Omit<Account, "id">) {
        const id = crypto.randomUUID();
        this.accounts[id] = { ...account, id };
        this.save();
    }

    deleteAccount(id: string) {
        delete this.accounts[id];
        this.save();
    }
}

const AddAccountModal = ({ manager, onClose, ...props }: Modal.ModalProps & {
    manager: TokenLoginManager;
    onClose: () => void;
}) => {
    const [username, setUsername] = React.useState("");
    const [token, setToken] = React.useState("");

    return (
        <Modal.ModalRoot {...props}>
            <Modal.ModalHeader separator={false}>
                <Text variant="heading-lg/semibold">Add Account</Text>
            </Modal.ModalHeader>
            <Modal.ModalContent className="token-login-modal-content">
                <div className="token-login-section">
                    <Text variant="heading-sm/medium" style={{ marginBottom: "8px" }}>Username</Text>
                    <TextInput
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e)}
                    />
                </div>
                <div className="token-login-section">
                    <Text variant="heading-sm/medium" style={{ marginBottom: "8px" }}>Token</Text>
                    <TextInput
                        placeholder="User Token"
                        value={token}
                        onChange={e => setToken(e)}
                    />
                </div>
            </Modal.ModalContent>
            <Modal.ModalFooter className="token-login-footer">
                <Flex style={{ justifyContent: "flex-end", gap: "10px" }}>
                    <Button
                        color={Button.Colors.BRAND}
                        disabled={!username || !token}
                        onClick={() => {
                            manager.addAccount({ username, token });
                            onClose();
                        }}
                    >
                        Save
                    </Button>
                    <Button
                        color={Button.Colors.TRANSPARENT}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                </Flex>
            </Modal.ModalFooter>
        </Modal.ModalRoot>
    );
};

const AccountEntryComponent = ({ account, manager, onDelete }: {
    account: Account;
    manager: TokenLoginManager;
    onDelete: () => void;
}) => {
    const [showToken, setShowToken] = React.useState(false);

    return (
        <div className="account-entry" key={account.id}>
            <div>
                <Text variant="heading-sm/medium">{account.username}</Text>
                <Text className="token-field">{showToken ? account.token : "••••••••••••••••"}</Text>
            </div>
            <div className="account-actions">
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={() => setShowToken(!showToken)}
                >
                    {showToken ? "Hide Token" : "Show Token"}
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.BRAND}
                    onClick={() => loginWithToken(account.token)}
                >
                    Login
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    onClick={() => {
                        manager.deleteAccount(account.id);
                        onDelete();
                    }}
                >
                    Delete
                </Button>
            </div>
        </div>
    );
};

class TokenLoginManagerUI {
    private manager: TokenLoginManager;
    private forceUpdate: () => void;

    constructor(manager: TokenLoginManager) {
        this.manager = manager;
        this.forceUpdate = () => { };
    }

    render = () => {
        const [, setUpdateKey] = React.useState({});
        this.forceUpdate = () => setUpdateKey({});

        return (
            <div className="token-login-container">
                <Flex style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Text variant="heading-lg/semibold">Token Login Manager</Text>
                    <Button
                        onClick={() => {
                            Modal.openModal(props => (
                                <AddAccountModal
                                    {...props}
                                    manager={this.manager}
                                    onClose={() => {
                                        props.onClose();
                                        this.forceUpdate();
                                    }}
                                />
                            ));
                        }}
                    >
                        Add Account
                    </Button>
                </Flex>
                {Object.values(this.manager.accounts).map(account => (
                    <AccountEntryComponent
                        key={account.id}
                        account={account}
                        manager={this.manager}
                        onDelete={this.forceUpdate}
                    />
                ))}
            </div>
        );
    };
}

export default definePlugin({
    name: "TokenLoginManager",
    description: "Manage and login with user tokens",
    authors: [Devs.rz30],

    tokenLoginManager: null as TokenLoginManager | null,
    ui: null as TokenLoginManagerUI | null,

    async start() {
        this.tokenLoginManager = new TokenLoginManager();
        await this.tokenLoginManager.init();
        this.ui = new TokenLoginManagerUI(this.tokenLoginManager);

        const { customEntries, customSections } = SettingsPlugin;

        customEntries.push({
            key: "tokenLoginManager",
            title: "Token Login Manager",
            Component: () => this.ui!.render(),
            Icon: () => React.createElement("div", {}, "🔑") // Placeholder icon
        });

        customSections.push(() => ({
            section: "TokenLoginManager",
            label: "Token Login Manager",
            element: () => this.ui!.render(),
            id: "TokenLoginManager"
        }));
    },

    stop() {
        const { customEntries } = SettingsPlugin;
        const entry = customEntries.findIndex(entry => entry.key === "tokenLoginManager");
        if (entry !== -1) customEntries.splice(entry, 1);

        this.tokenLoginManager = null;
        this.ui = null;
    }
});
