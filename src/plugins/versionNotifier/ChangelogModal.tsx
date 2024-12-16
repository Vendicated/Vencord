/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Link } from "@components/Link";
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

const ChangelogModal = ({ modalProps, lastKnownVersion }: { modalProps: ModalProps, lastKnownVersion: string; }): React.JSX.Element => {
    const [commits, setCommits] = React.useState<any[]>([]);

    React.useEffect(() => {
        const fetchAndSetCommits = async () => {
            const commitData = await fetchCommits();
            setCommits(commitData);
        };
        fetchAndSetCommits();
    }, []);

    // const handleViewOnGitHub = (url: string) => {
    //     window.open(url, "_blank");
    // };

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-xl/bold">
                    New Version Installed: {` v${VERSION} > v${lastKnownVersion}`} {IS_DEV ? "(DEV)" : ""}
                </Text>
            </ModalHeader>
            <ModalContent>
                <Text
                    variant="heading-xl/medium"
                    className="p-3"
                    lineClamp={2}
                >
                    Latest Change:
                </Text>
                <div>
                    {commits.length > 0 ? (
                        <div className="space-y-3">
                            {commits.at(0) && (
                                <div key={commits.at(0).sha} className="border border-gray-300 rounded p-3 mt-3">
                                    <Link
                                        href={commits.at(0).html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold"
                                    >
                                        {commits.at(0).commit.message}
                                    </Link>
                                    <Text
                                        variant="text-sm/normal"
                                        className="text-gray-500"
                                    >
                                        Author: {commits.at(0).commit.author.name} | Date:{" "}
                                        {new Date(commits.at(0).commit.author.date).toLocaleString()}
                                    </Text>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Text variant="text-md/bold">
                            No commits found for the latest version.
                        </Text>
                    )}
                </div>
                <div className="space-y-7">
                    <div>
                        <Text variant="heading-xl/medium" className="p-3">
                            Recent Commits
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
                                            className="border border-gray-300 rounded p-3 mb-2"
                                        >
                                            <Link
                                                href={commit.html_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-lighter"
                                            >
                                                {commit.commit.message}
                                            </Link>
                                            <Text
                                                variant="text-sm/normal"
                                                className="text-gray-500"
                                            >
                                                Author:{" "}
                                                {commit.commit.author.name} |
                                                Date:{" "}
                                                {new Date(
                                                    commit.commit.author.date
                                                ).toLocaleString()}
                                            </Text>
                                        </div>
                                    )
                                )}
                            </div>
                        ) : (
                            <Text variant="text-md/bold">
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
        </ModalRoot >
    );
};

export default function openChangelogModal(lastKnownVersion: string) {
    // eslint-disable-next-line @stylistic/arrow-parens
    openModal((modalProps) => <ChangelogModal modalProps={modalProps} lastKnownVersion={lastKnownVersion} />);
}
