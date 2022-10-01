import gitHash from "git-hash";
import { changes, checkForUpdates, getRepo, rebuild, update, UpdateLogger } from "../utils/updater";
import { React, Forms, Button, Margins, Alerts, Card, Parser, Toasts } from '../webpack/common';
import { Flex } from "./Flex";
import { useAwaiter } from '../utils/misc';
import { Link } from "./Link";
import ErrorBoundary from "./ErrorBoundary";


function withDispatcher(dispatcher: React.Dispatch<React.SetStateAction<boolean>>, action: () => any) {
    return async () => {
        dispatcher(true);
        try {
            await action();
        } catch (e: any) {
            UpdateLogger.error("Failed to update", e);
            if (!e) {
                var err = "An unknown error occurred (error is undefined).\nPlease try again.";
            } else if (e.code && e.cmd) {
                const { code, path, cmd, stderr } = e;

                if (code === "ENOENT")
                    var err = `Command \`${path}\` not found.\nPlease install it and try again`;
                else {
                    var err = `An error occured while running \`${cmd}\`:\n`;
                    err += stderr || `Code \`${code}\`. See the console for more info`;
                }

            } else {
                var err = "An unknown error occurred. See the console for more info.";
            }
            Alerts.show({
                title: "Oops!",
                body: err.split("\n").map(line => <div>{Parser.parse(line)}</div>)
            });
        }
        finally {
            dispatcher(false);
        }
    };
};

export default ErrorBoundary.wrap(function Updater() {
    const [repo, err, repoPending] = useAwaiter(getRepo, "Loading...");
    const [isChecking, setIsChecking] = React.useState(false);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [updates, setUpdates] = React.useState(changes);

    React.useEffect(() => {
        if (err)
            UpdateLogger.error("Failed to retrieve repo", err);
    }, [err]);

    const isOutdated = updates.length > 0;

    return (
        <Forms.FormSection tag="h1" title="Vencord Updater">
            <Forms.FormTitle tag="h5">Repo</Forms.FormTitle>

            <Forms.FormText>{repoPending ? repo : err ? "Failed to retrieve - check console" : (
                <Link href={repo}>
                    {repo.split("/").slice(-2).join("/")}
                </Link>
            )} ({gitHash})</Forms.FormText>

            <Forms.FormDivider />

            <Forms.FormTitle tag="h5">Updates</Forms.FormTitle>

            <Forms.FormText className={Margins.marginBottom8}>
                {updates.length ? `There are ${updates.length} Updates` : "Up to Date!"}
            </Forms.FormText>

            {updates.length > 0 && (
                <Card style={{ padding: ".5em" }}>
                    {updates.map(({ hash, author, message }) => (
                        <div>
                            <Link href={`${repo}/commit/${hash}`} disabled={repoPending}>
                                <code>{hash}</code>
                            </Link>
                            <span style={{
                                marginLeft: "0.5em",
                                color: "var(--text-normal)"
                            }}>{message} - {author}</span>
                        </div>
                    ))}
                </Card>
            )}

            <Flex className={`${Margins.marginBottom8} ${Margins.marginTop8}`}>
                {isOutdated && <Button
                    size={Button.Sizes.SMALL}
                    disabled={isUpdating || isChecking}
                    onClick={withDispatcher(setIsUpdating, async () => {
                        if (await update()) {
                            setUpdates([]);
                            const needFullRestart = await rebuild();
                            await new Promise<void>(r => {
                                Alerts.show({
                                    title: "Update Success!",
                                    body: "Successfully updated. Restart now to apply the changes?",
                                    confirmText: "Restart",
                                    cancelText: "Not now!",
                                    onConfirm() {
                                        if (needFullRestart)
                                            window.DiscordNative.app.relaunch();
                                        else
                                            location.reload();
                                        r();
                                    },
                                    onCancel: r
                                });
                            });
                        }
                    })}
                >
                    Update Now
                </Button>}
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={isUpdating || isChecking}
                    onClick={withDispatcher(setIsChecking, async () => {
                        const outdated = await checkForUpdates();
                        if (outdated) {
                            setUpdates(changes);
                        } else {
                            setUpdates([]);
                            Toasts.show({
                                message: "No updates found!",
                                id: Toasts.genId(),
                                type: Toasts.Type.MESSAGE,
                                options: {
                                    position: Toasts.Position.BOTTOM
                                }
                            });
                        }
                    })}
                >
                    Check for Updates
                </Button>
            </Flex>
        </Forms.FormSection>
    );
});
