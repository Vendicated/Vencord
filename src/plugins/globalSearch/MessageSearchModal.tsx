import { ModalRoot, ModalHeader, ModalContent, ModalFooter, ModalCloseButton, ModalSize, ModalProps, openModal } from "@utils/modal";
import { Forms, React, Button, TextInput, Constants, useState, Text, UserStore, ChannelRouter, RestAPI } from "@webpack/common";
import { findByPropsLazy } from "@webpack"; // Added findByPropsLazy

const Kangaroo = findByPropsLazy("jumpToMessage"); // Changed to findByPropsLazy with a single prop


interface MessageAuthor {
    id: string;
    username: string;
    avatar: string | null;
}

interface MessageSearchModalProps extends ModalProps {
    // i dont remember why i added this
}

// structure of a search result item
interface SearchResultItem {
    id: string;
    content: string;
    author: MessageAuthor;
    channel_id: string;
    timestamp: string;
}

// structure for the messages tab data and for the cursor
interface MessagesTabData {
    messages: SearchResultItem[][];
    cursor?: string | null;
}

interface SearchResponse {
    tabs: {
        messages: MessagesTabData;
    };
}

// avatar url function
const getAvatarUrl = (userId?: string, avatarHash?: string | null) => {
    if (!userId || !avatarHash) {
        // placeholder
        return `https://cdn.discordapp.com/embed/avatars/${(parseInt(userId || "0") % 5)}.png`;
    }
    const extension = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=32`;
};

function MessageSearchModal(props: MessageSearchModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [nextMessagesCursor, setNextMessagesCursor] = useState<string | null>(null); // Added state for pagination

    const handleNavigateToMessage = (channelId: string, messageId: string) => {
        // debugging kills
        if (ChannelRouter && typeof ChannelRouter.transitionToChannel === 'function') {
            ChannelRouter.transitionToChannel(channelId); // use the imported module directly

            setTimeout(() => {
                if (Kangaroo && typeof Kangaroo.jumpToMessage === 'function') {
                    Kangaroo.jumpToMessage({
                        channelId,
                        messageId,
                        flash: false,
                        jumpType: "INSTANT"
                    });
                    setTimeout(() => {
                        props.onClose();
                    }, 300);
                } else {
                    console.error("[MessageSearch] Kangaroo module or jumpToMessage function not available when trying to jump.", Kangaroo);
                    alert("Failed to navigate: Kangaroo module (for message jump) not available.");
                }
            }, 700);
        } else {
            console.error("[MessageSearch] ChannelRouter module or transitionToChannel function not available from @webpack/common.", ChannelRouter);
        }
    };

    const handleSearch = async (currentCursor: string | null = null) => {
        if (!searchQuery.trim()) return;
        setIsLoading(true);

        // newify this shit
        if (!currentCursor) {
            setSearchResults([]);
            setNextMessagesCursor(null);
        }

        const requestBody = {
            tabs: {
                messages: {
                    sort_by: "timestamp",
                    sort_order: "desc",
                    content: searchQuery,
                    cursor: currentCursor,
                    limit: 25,
                }
            },
            track_exact_total_hits: false,
        };

        const relativeApiPath = "/users/@me/messages/search/tabs";

        try {
            const response = await RestAPI.post({
                url: relativeApiPath,
                body: requestBody,
                oldFormErrors: true,
            });


            let data: SearchResponse | null = null;
            data = response.body as SearchResponse;

            if (!data) {
                alert("Search failed: Server returned no usable data. Check console for details.");
                setIsLoading(false);
                return;
            }

            if (!data.tabs || !data.tabs.messages || !data.tabs.messages.messages) {
                console.error("[MessageSearch] API response body does not have the expected structure. Parsed data:", data);
                // dont clear results if it's a pagination attempt that failed plspls
                setIsLoading(false);
                return;
            }

            const newMessages: SearchResultItem[] = data.tabs.messages.messages.flat();
            setSearchResults(prevResults => currentCursor ? [...prevResults, ...newMessages] : newMessages);
            setNextMessagesCursor(data.tabs.messages.cursor || null); // update the cursor for next page

        } catch (error: any) {
            console.error("[MessageSearch] Error during RestAPI.post operation:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <ModalHeader>
                <Forms.FormTitle tag="h2">Global Search</Forms.FormTitle>
                <Forms.FormText style={{ fontStyle: "italic", fontSize: "0.9em", marginTop: "-5px", marginBottom: "10px" }}>
                    by Jaisal (AtomicByte)
                </Forms.FormText>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent>
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                    <TextInput
                        placeholder="Enter search query..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                        style={{ flexGrow: 1 }}
                    />
                    <Button onClick={() => handleSearch()} disabled={isLoading}>
                        {isLoading ? "Searching..." : "Search"}
                    </Button>
                </div>

                <div>
                    {searchResults.length === 0 && !isLoading && (
                        <Forms.FormText>No results found, or search not yet performed.</Forms.FormText>
                    )}
                    {searchResults.map((item: SearchResultItem) => (
                        <div
                            key={item.id}
                            style={{
                                marginBottom: "10px",
                                padding: "10px",
                                border: "1px solid var(--background-modifier-accent)",
                                borderRadius: "5px",
                                cursor: "pointer"
                            }}
                            onClick={() => handleNavigateToMessage(item.channel_id, item.id)}
                        >
                            <div style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                                <img
                                    src={getAvatarUrl(item.author.id, item.author.avatar)}
                                    alt={`${item.author.username}'s avatar`}
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        marginRight: "10px",
                                        objectFit: "cover"
                                    }}
                                />
                                <Text color="header-primary" variant="text-md/semibold">{item.author.username}</Text>
                                <Text color="text-muted" style={{ marginLeft: "10px", fontSize: "0.8em" }}>
                                    {new Date(item.timestamp).toLocaleString()}
                                </Text>
                            </div>
                            <Text color="text-normal" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.content}</Text>
                            <Forms.FormText style={{ fontSize: "0.75em", marginTop: "5px", color: 'var(--text-muted)' }}>
                                Channel ID: {item.channel_id} | Message ID: {item.id}
                            </Forms.FormText>
                        </div>
                    ))}
                </div>
            </ModalContent>
            <ModalFooter>
                {nextMessagesCursor && !isLoading && (
                    <Button onClick={() => handleSearch(nextMessagesCursor)} disabled={isLoading}>
                        Load More
                    </Button>
                )}
            </ModalFooter>
        </ModalRoot>
    );
}

export function openGlobalSearchModal() {
    openModal(props => <MessageSearchModal {...props} />);
} 