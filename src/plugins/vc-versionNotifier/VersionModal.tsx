/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    ModalSize,
    openModal,
} from "@utils/modal";
import { Button, Flex, React, Text } from "@webpack/common";
import { Key } from "react";

const fetchCommits = async () => {
    try {
        const response = await fetch(
            "https://api.github.com/repos/Vendicated/Vencord/commits?per_page=5&since=2023-12-15T11:22:13.968319"
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching commits:", error);
        return [];
    }
};

const VersionModal = ({ modalProps }: { modalProps: ModalProps }) => {
    const [commits, setCommits] = React.useState<any[]>([]);

    React.useEffect(() => {
        const fetchAndSetCommits = async () => {
            const commitData = await fetchCommits();
            setCommits(commitData);
        };
        fetchAndSetCommits();
    }, []);

    const handleViewOnGitHub = (url: string) => {
        window.open(url, "_blank");
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold">
                    New Version Available {` v${VERSION}`}
                </Text>
            </ModalHeader>
            <ModalContent>
                <Text variant="text-md/bold">
                    Below are the changes in the new version:
                </Text>
                <div className="space-y-4">
                    <div>
                        <Text variant="heading-md/semibold">
                            Latest Commits
                        </Text>
                        {commits.length > 0 ? (
                            <div className="space-y-3">
                                {commits.slice(0, 5).map(
                                    (commit: {
                                        sha: Key | null | undefined;
                                        commit: {
                                            message: any;
                                            author: {
                                                name: any;
                                                date: string | number | Date;
                                            };
                                        };
                                        html_url: string;
                                    }) => (
                                        <div
                                            key={commit.sha}
                                            className="border border-gray-300 rounded p-3"
                                        >
                                            <Text
                                                variant="body-md"
                                                className="font-semibold"
                                            >
                                                {commit.commit.message}
                                            </Text>
                                            <Text
                                                variant="body-sm"
                                                className="text-gray-500"
                                            >
                                                Author:{" "}
                                                {commit.commit.author.name} |
                                                Date:{" "}
                                                {new Date(
                                                    commit.commit.author.date
                                                ).toLocaleString()}
                                            </Text>
                                            <Flex
                                                justify={Flex.Justify.END}
                                                className="mt-2"
                                            >
                                                <Button
                                                    color={Button.Colors.GREEN}
                                                    size={Button.Sizes.SMALL}
                                                    onClick={() =>
                                                        handleViewOnGitHub(
                                                            commit.html_url
                                                        )
                                                    }
                                                >
                                                    View on GitHub
                                                </Button>
                                            </Flex>
                                        </div>
                                    )
                                )}
                            </div>
                        ) : (
                            <Text variant="body-md">
                                No commits found for the latest version.
                            </Text>
                        )}
                    </div>
                </div>
            </ModalContent>
            <ModalFooter>
                <Flex direction={Flex.Direction.HORIZONTAL_REVERSE}>
                    <Button
                        color={Button.Colors.GREEN}
                        onClick={modalProps.onClose}
                    >
                        Continue
                    </Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
};

export function openVersionModal() {
    // eslint-disable-next-line @stylistic/arrow-parens
    openModal((modalProps) => <VersionModal modalProps={modalProps} />);
}
