import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addPreSendListener, removePreSendListener, SendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, useEffect, useState } from "@webpack/common";

let lastState = false;
let startran = false;

const settings = definePluginSettings({
    persistState: {
        type: OptionType.BOOLEAN,
        description: "Whether to persist the state of the silent message toggle when changing channels",
        default: true,
        onChange(newValue: boolean) {
            if (newValue === false) lastState = false;
        }
    },
    autoDisable: {
        type: OptionType.BOOLEAN,
        description: "Automatically disable the silent message toggle again after sending one",
        default: false
    },
    autoOn: {
        type: OptionType.BOOLEAN,
        description: "Automatically turn on when the Client starts (will be replaced with Persist state upon restart at some point)",
        default: true
    }
});

const generateRandomString = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.';
    const length = 4;
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const getSelectedChannelId = () => {
    const highlightedDM = document.querySelector("[class*='interactiveSelected']");//document.querySelector(".interactiveSelected__689f0");
    if (highlightedDM) {
        const listItem = highlightedDM.querySelector("[data-list-item-id^='private-channels-uid_']");
        if (listItem) {
            const itemId = listItem.getAttribute("data-list-item-id");
            if (itemId) {
                const channelId = itemId.split("private-channels-uid_")[1].split("___")[1];
                return channelId;
            }
        }
    }
    return null;
};

const SilentMessageToggle: ChatBarButton = ({ isMainChat }) => {
    const [enabled, setEnabled] = useState(lastState);

    function setEnabledValue(value: boolean) {
        if (settings.store.persistState) lastState = value;
        setEnabled(value);
    }

    function getUserIdFromAvatarWrapper() {
        const avatarWrapper = document.querySelector("[class*='avatarWrapper']");

        if (avatarWrapper) {
            const imgElement = avatarWrapper.querySelector("[class*='avatar__']"); // Select the image element inside the avatar wrapper
            if (imgElement) {
                const src = imgElement.getAttribute('src'); // Get the value of the src attribute
                const regex = /\/(\d{17,20})\//; // Regular expression to extract the user ID from the URL
                const match = src.match(regex); // Use the regular expression to match the user ID
                if (match && match[1]) {
                    return match[1]; // Return the user ID
                }
            }
        }

        return null; // Return null if the user ID cannot be extracted
    }

    useEffect(() => {
        if (settings.store.autoOn && startran==false) {
            setEnabled(true);
            startran = true;
        }
        const listener: SendListener = (_, message) => {
            if (enabled) {
                if (settings.store.autoDisable) setEnabledValue(false);//if (!message.content.startsWith("@silent ")) { //Yes I reused the @silent msg plugin because I have Zero Clue how that shit works
                const randomString = generateRandomString();
                let otherUserId = getSelectedChannelId();
                if (otherUserId && message.content!="") {
                    const userId = getUserIdFromAvatarWrapper();
                    message.content = message.content + ` [⠀](https://receipt.kaiyo.dev/${userId}/${otherUserId}/${randomString})`;
                }
            } //ٴ
            //ٰ
            //﮲
            //՟
            //ֹ
            //ׂ
        };

        addPreSendListener(listener);
        return () => void removePreSendListener(listener);
    }, [enabled]);

    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip={enabled ? "Disable Read Receipts" : "Enable Read Receipts"}
            onClick={() => setEnabledValue(!enabled)}
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                style={{ scale: "1" }}
            >

                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 11.2222L10.8462 13L15 9M21 20L17.6757 18.3378C17.4237 18.2118 17.2977 18.1488 17.1656 18.1044C17.0484 18.065 16.9277 18.0365 16.8052 18.0193C16.6672 18 16.5263 18 16.2446 18H6.2C5.07989 18 4.51984 18 4.09202 17.782C3.71569 17.5903 3.40973 17.2843 3.21799 16.908C3 16.4802 3 15.9201 3 14.8V7.2C3 6.07989 3 5.51984 3.21799 5.09202C3.40973 4.71569 3.71569 4.40973 4.09202 4.21799C4.51984 4 5.0799 4 6.2 4H17.8C18.9201 4 19.4802 4 19.908 4.21799C20.2843 4.40973 20.5903 4.71569 20.782 5.09202C21 5.51984 21 6.0799 21 7.2V20Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                {!enabled && <>
                    <mask id="_">
                        <path fill="#fff" d="M0 0h24v24H0Z" />
                        <path stroke="#000" strokeWidth="6" d="M0 24 24 0" />
                    </mask>
                    <path fill="var(--status-danger)" d="m21.178 1.70703 1.414 1.414L4.12103 21.593l-1.414-1.415L21.178 1.70703Z" />
                </>}
            </svg>
        </ChatBarButton>
    );
    //<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    //    <path d="M9 12.2222L10.8462 14L15 10M21.0039 12C21.0039 16.9706 16.9745 21 12.0039 21C9.9675 21 3.00463 21 3.00463 21C3.00463 21 4.56382 17.2561 3.93982 16.0008C3.34076 14.7956 3.00391 13.4372 3.00391 12C3.00391 7.02944 7.03334 3 12.0039 3C16.9745 3 21.0039 7.02944 21.0039 12Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    //    </svg>
};

export default definePlugin({
    name: "Read Receipts Plugin",
    description: "Shows a checkmark when the recipient has viewed your direct message.",
    dependencies: ["MessageEventsAPI", "ChatInputButtonAPI"],
    settings,
    authors: [
        {
            id: 641766303631278080n,
            name: "Kaiyo Fox",
        },
    ],
    patches: [{ //Just because the plugin needs to restart.
        find: "",
        replacement: [{
            match: "",
            replace: ""
        },
        {
            match: "",
            replace: ""
        }]
    }],

    start() {
        addChatBarButton("SilentMessageToggle", SilentMessageToggle)

        function getUserIdFromAvatarWrapper() {
            const avatarWrapper = document.querySelector("[class*='avatarWrapper']");

            if (avatarWrapper) {
                const imgElement = avatarWrapper.querySelector("[class*='avatar__']"); // Select the image element inside the avatar wrapper
                if (imgElement) {
                    const src = imgElement.getAttribute('src'); // Get the value of the src attribute
                    const regex = /\/(\d{17,20})\//; // Regular expression to extract the user ID from the URL
                    const match = src.match(regex); // Use the regular expression to match the user ID
                    if (match && match[1]) {
                        return match[1]; // Return the user ID
                    }
                }
            }

            return null; // Return null if the user ID cannot be extracted
        }

        const removeUnoKaiyoDev = () => {
            try {
                const userId = getUserIdFromAvatarWrapper();//`[⠀](https://receipt.kaiyo.dev/${userId}
                document.querySelectorAll(`a[href*="receipt.kaiyo.dev/${userId}"], img[src*="receipt.kaiyo.dev/${userId}"]`).forEach(element => {
                    element.style.display = 'none';
                });

                const messages = document.querySelectorAll('.messageContent');
                messages.forEach(message => {
                    let content = message.textContent.trim();
                    if (content.endsWith("⠀")) {
                        content = content.slice(0, -1);
                        message.textContent = content;
                    }
                });
            } catch (error) {
                console.error("An error occurred:", error);
            }
        };

        const preflightCORS = async (userId: string, dmUserId: string) => {
            try {
                await fetch(`https://receipt.kaiyo.dev/get/${userId}/${dmUserId}`, {
                    method: 'OPTIONS',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            } catch (error) {
                console.error("Error during CORS preflight:", error);
            }
        };

        // Function to send GET request and process response
        const processReadReceipts = async (userId: string, dmUserId: string) => {
            try {
                await preflightCORS(userId, dmUserId); // Preflight  ... I freaking hate it

                const response = await fetch(`https://receipt.kaiyo.dev/get/${userId}/${dmUserId}`, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                //console.log("Response JSON for userId:", userId, "and dmUserId:", dmUserId, ":", data);
                processMessages(userId, dmUserId, data);

            } catch (error) {
                console.error("Error processing read receipts:", error);
            }
        };

        const processMessages = (userId: string, dmUserId: string, data: any) => {
            for (const messageKey in data) {
                if (data.hasOwnProperty(messageKey)) {
                    const messageData = data[messageKey];
                    const linkToCheck = `https://receipt.kaiyo.dev/${userId}/${dmUserId}/${messageKey}`;

                    const messageElements = document.querySelectorAll("[class*='messageListItem']");//document.querySelectorAll('.messageListItem__050f9');

                    for (const messageElement of messageElements) {
                        const anchorElement = messageElement.querySelector('a');
                        if (anchorElement && anchorElement.href === linkToCheck) {
                            //const messageContentElement = messageElement.querySelector("[class*='messageContent']");//messageElement.querySelector('.messageContent_abea64');
                            const messageContentElement = messageElement.querySelector("[class*='messageContent']:not([class*='repliedTextContent'])")

                            if (messageContentElement) {
                                const messageContent = messageContentElement.textContent.trim();
                                //console.log(`JSON Data: ${JSON.stringify(messageData)}`);
                                //console.log(`Message Text: ${messageContent}`);
                                if (messageData.read && !messageContentElement.textContent.includes("✔")) {
                                    const unixTimeInSeconds = messageData.readAt;
                                    const currentTime = new Date(unixTimeInSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
                                    //messageContentElement.innerHTML = `${messageContent} <span style="font-weight: bold; font-size: 60%; color: #5865F2; padding: 2px 5px; border-radius: 4px; border: 1px solid #5865F2;">✔</span>`; // Append check mark with rounded square box
                                    //messageContentElement.innerHTML = `${messageContent} <span style="font-weight: bold; font-size: 60%; color: white; padding: 1px 3px; border-radius: 3px; background-color: #5865F2;">✔</span>`; // Append check mark with rounded square box
                                    //messageContentElement.innerHTML = `${messageContent} <span style="font-weight: bold; font-size: 50%; color: white; padding: 1px 2px; border-radius: 2px; background-color: #5865F2; position: relative; bottom: -1px; left: 2px;">✔</span>`;
                                    //const targetSpan = messageContentElement.querySelector('span'); // Replace 'span' with the appropriate selector
                                    //const targetSpan = messageContentElement.querySelector('span:last-child');
                                    //const targetSpan = messageContentElement.lastElementChild;
                                    let targetSpan;
                                    for (let i = messageContentElement.childNodes.length - 1; i >= 0; i--) {
                                        const node = messageContentElement.childNodes[i];
                                        if (
                                            node.nodeName.toLowerCase() === 'span' || node.nodeName.toLowerCase() === 'em' || node.nodeName.toLowerCase() === 'strong' || node.nodeName.toLowerCase() === 'h1' || node.nodeName.toLowerCase() === 'h2' || node.nodeName.toLowerCase() === 'h3' &&
                                            !node.className.includes('edited') &&
                                            !node.className.includes('timestamp') &&
                                            !node.className.includes('repliedTextPreview') &&
                                            !node.className.includes('repliedTextContent') &&
                                            !node.parentNode.className.includes('repliedTextContent') &&
                                            (!node.querySelector("[class*='edited']") || !node.querySelector('.timestamp'))
                                        ) {
                                            targetSpan = node;
                                            break;
                                        }
                                    }


                                    if (targetSpan) {
                                        const spaceBEcauseIAmLazy = document.createElement('span');
                                        spaceBEcauseIAmLazy.style.fontWeight = 'bold';
                                        spaceBEcauseIAmLazy.style.fontSize = '80%';
                                        spaceBEcauseIAmLazy.textContent = '  ';
                                        targetSpan.appendChild(spaceBEcauseIAmLazy);


                                        const checkmarkSpan = document.createElement('span');
                                        checkmarkSpan.classList.add('checkmark');
                                        checkmarkSpan.style.fontWeight = 'bold'; // Set font weight to normal for standard font
                                        checkmarkSpan.style.fontSize = '10px'; // Set font size
                                        checkmarkSpan.style.color = 'white';
                                        checkmarkSpan.style.paddingLeft = '3px';
                                        checkmarkSpan.style.paddingRight = '3px';
                                        checkmarkSpan.style.paddingTop = '0px';
                                        checkmarkSpan.style.width = '12px'; // Set width explicitly
                                        checkmarkSpan.style.height = '12px'; // Set height explicitly
                                        checkmarkSpan.style.borderRadius = '4px';
                                        checkmarkSpan.style.backgroundColor = '#5865F2';
                                        //checkmarkSpan.ariaLabel = "Test";
                                        //checkmarkSpan.ariaHidden = "false";
                                        checkmarkSpan.textContent = '✔';

                                        targetSpan.appendChild(checkmarkSpan);


                                        //const test = document.createElement('span');
                                        //test.innerHTML = `<svg aria-label="System Message" class="botTagVerified__3e0e4" aria-hidden="false" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M18.7 7.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4l3.3 3.29 7.3-7.3a1 1 0 0 1 1.4 0Z" clip-rule="evenodd" class=""></path></svg>`
                                        //targetSpan.appendChild(test);
                                    }


                                    const checkmarkContainer = document.createElement('div');
                                    checkmarkContainer.classList.add('checkmark-container');
                                    checkmarkContainer.style.display = 'flex';
                                    checkmarkContainer.innerHTML = `
                                        <span class="tooltip" style="margin-left: 3px; display: none;">Read at ${currentTime}</span>
                                    `;
                                    messageElement.appendChild(checkmarkContainer);

                                    const styleElement = document.createElement('style');
                                    styleElement.textContent = `
                                        .checkmark-container {
                                            align-items: center; // Center align items vertically
                                            border-radius: 4px;
                                        }
                                        .tooltip {
                                            background-color: #5865F2;
                                            color: white;
                                            border-radius: 4px;
                                            padding: 3px 8px;
                                            font-size: 12px;
                                            display: none;
                                            position: absolute;
                                            z-index: 9999;
                                            left: 40px;
                                        }
                                        .checkmark-container:hover .tooltip {
                                            display: inline; // Show tooltip on hover
                                        }
                                    `;//110px 
                                    document.head.appendChild(styleElement);

                                    if (targetSpan) {
                                        const checkmarkElement = targetSpan.querySelector('.checkmark');
                                        if (checkmarkElement) {
                                            checkmarkElement.addEventListener('mouseenter', () => {
                                                const tooltip = checkmarkContainer.querySelector('.tooltip');
                                                if (tooltip) {
                                                    //const mouseX = event.clientX;
                                                    //const mouseY = event.clientY;
                                                    //tooltip.style.left = mouseX + 'px';
                                                    //tooltip.style.top = mouseY + 'px';
                                                    tooltip.style.display = 'inline';
                                                }
                                            });

                                            checkmarkElement.addEventListener('mouseleave', () => {
                                                const tooltip = checkmarkContainer.querySelector('.tooltip');
                                                if (tooltip) {
                                                    tooltip.style.display = 'none';
                                                }
                                            });
                                        }
                                    }
                                }

                                //if (!messageData.firstPing && !messageData.read) {
                                //    fetch(`https://receipt.kaiyo.dev/owner/${userId}/${dmUserId}/${messageKey}`)
                                //        .then(response => {
                                //            if (response.ok) {
                                //                //console.log("GET request to /owner successful");
                                //            } else {
                                //                throw new Error(`GET request to /owner failed with status: ${response.status}`);
                                //            }
                                //        })
                                //        .catch(error => {
                                //            console.error("Error sending GET request to /owner:", error);
                                //        });
                                //}

                                break;
                            }
                        }
                    }
                }
            }
        };

        const intervalId = setInterval(() => {
            removeUnoKaiyoDev();
            //const highlightedDM = document.querySelector(".interactiveSelected__689f0");
            const highlightedDM = document.querySelector("[class*='interactiveSelected']");
            if (highlightedDM) {
                const dmUserId = highlightedDM.querySelector("[data-list-item-id^='private-channels-uid_']");
                if (dmUserId) {
                    const channelId = dmUserId.getAttribute("data-list-item-id").split("private-channels-uid_")[1].split("___")[1];
                    const userId = getUserIdFromAvatarWrapper();
                    if (channelId) {
                        processReadReceipts(userId, channelId);
                    }
                }
            }
        }, 5000); //2000 worked really well

        removeUnoKaiyoDev();

        document.addEventListener("click", (event) => {
            const dmLink = event.target.closest("[data-list-item-id^='private-channels-uid_']");
            if (dmLink) {
                const dmUserId = dmLink.getAttribute("data-list-item-id").split("private-channels-uid_")[1].split("___")[1];
                const userId = getUserIdFromAvatarWrapper();// 641766303631278080
                processReadReceipts(userId, dmUserId);
            }
        });

        const stopE = () => {
            removeChatBarButton("SilentMessageToggle")
            clearInterval(intervalId);
        };

        return { stopE };
    },
    stop() {
        removeChatBarButton("SilentMessageToggle")
    },
});
