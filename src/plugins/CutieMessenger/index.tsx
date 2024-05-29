/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { MessageActions } from "@webpack/common";
import React, { type SVGProps } from "react";

const CUTIE_MESSAGES = [
    "You're so cute, you make my heart skip a beat! 💓",
    "I can't help but smile when I see your adorable face 😊",
    "You're the definition of cuteness overload! 💖",
    "I just want to squeeze you tight and never let go 🤗",
    "Your cuteness is out of this world! 🚀",
    "You're like a ray of sunshine on a cloudy day ☀️",
    "I'm so lucky to have such a cute person in my life 🍀",
    "You're the cutest thing since sliced bread 🍞",
    "Can't resist your cute charm! 😍",
    "So cute, I could just eat you up 🍰",
    "Your cuteness is contagious, and I'm happily infected! 😷💕",
    "That smile of yours is the cutest thing I've ever seen 😊",
    "You make everything better with your cuteness 🌈",
    "Such a bundle of joy and cuteness 🎁",
    "Every time I see you, I fall in love with your cuteness all over again 💘",
    "Your cute giggle is music to my ears 🎶",
    "Impossible to have a bad day around you 🌟",
    "Your cuteness is like a magnet, I can't stay away 🧲",
    "Could spend hours just looking at your cute face 😍",
    "You're the cherry on top of my day with your cuteness 🍒",
    "Those cute little quirks make you unique and special 🌟",
    "Being around you is like being in a field of flowers, full of beauty and cuteness 🌸",
    "Your cuteness lights up my life like a thousand stars! ✨",
    "So cute, you make puppies and kittens jealous 🐶🐱",
    "Wish I could bottle up your cuteness and take it everywhere with me 🍼",
    "You bring so much joy and cuteness into my life 🎉",
    "Your cuteness is like a warm hug on a cold day 🧣",
    "So cute, you make candy look less sweet 🍬",
    "Seeing your cute face is the highlight of my day 🌞",
    "A cute little bundle of happiness 🎈",
    "Your cute personality is just as amazing as your adorable looks 🌟",
    "So cute, you make everyone around you smile 😊",
    "Your cuteness is like a breath of fresh air 🌬️",
    "So cute, you could be a cartoon character 🎨",
    "Your cuteness is like a sweet melody that plays in my heart 🎵",
    "You make rainbows look dull with your cuteness 🌈",
    "Best medicine for a bad day 💊",
    "A constant source of cuteness and happiness 🌸",
    "Can't get enough of your cute little face 😊",
    "Flowers bloom brighter around you 🌺",
    "Like a cozy blanket on a chilly night 🌙",
    "The cutest person I've ever met! 💕",
    "Your cuteness shines brighter than the sun ☀️",
    "You make everything better with your cuteness 🌟",
    "Your cuteness is the highlight of my day 🌞",
    "Such a cute little ray of sunshine 🌻",
    "Your cuteness is simply irresistible! 💘",
    "Can't help but smile because of your cuteness 😊",
    "Your cuteness is out of this world 🌌",
    "The cutest thing ever 💖",
    "Can't get enough of your cuteness 😍",
    "Your cuteness makes my heart melt 💓",
    "You brighten up my day with your cuteness ☀️",
    "Like a sweet dream come true 🌈",
    "You make life better with your cuteness 🌟",
    "The best thing in the world 🌍",
    "So cute, it's unbelievable 💕",
    "Like a little piece of heaven 🌸",
    "You make me happy with your cuteness 😊",
    "Simply amazing with your cuteness 🌟",
    "Make everything wonderful 🌈",
    "A gift to the world 🎁",
    "So cute, it's magical 🌟",
    "Like a beautiful sunrise 🌅",
    "You make my heart sing 🎶",
    "A joy to behold 😊",
    "You make the stars shine brighter ✨",
    "Like a breath of fresh air 🌬️",
    "Make me feel warm and fuzzy inside 💓",
    "A treasure with your cuteness 💎",
    "Make every moment special 🌟",
    "Like a ray of hope 🌈",
    "Make the world a better place 🌍",
    "Simply breathtaking 🌟",
    "You make my dreams come true 🌈",
    "A blessing with your cuteness 🌸",
    "Light up my life 🌞",
    "Beyond compare with your cuteness 💖",
    "You make my heart race 💓",
    "Like a gentle breeze 🌬️",
    "Make every day brighter ☀️",
    "A delight with your cuteness 😊",
    "Make my worries disappear 🌟",
    "Like a shining star ✨",
    "Make life more beautiful 🌸",
    "A work of art 🎨",
    "You make my heart flutter 💓",
    "Like a melody 🎵",
    "Bring joy to my heart 😊",
    "A precious gem 💎",
    "Make the world brighter 🌟",
    "Simply enchanting 🌟",
    "Make my heart soar 💓",
    "A gift that keeps on giving 🎁",
    "Make the clouds part and the sun shine ☀️",
    "Like a beautiful flower 🌸",
    "You make my heart happy 💖",
    "Like a rainbow after the rain 🌈",
    "You make my heart warm 💓",
    "Like a lovely song 🎶",
    "Make life sweeter 🍭",
    "A blessing in my life 🌸",
    "Make the stars align ✨",
    "Like a beautiful painting 🎨",
    "You make my heart skip a beat 💓",
    "Like a gentle rain 🌧️",
    "Make my heart sing with joy 🎵",
    "A constant source of happiness 😊",
    "Make my heart flutter with excitement 💓"
];

const RIZZ_MESSAGES = [
    "Are you a magician? Because whenever I look at you, everyone else disappears.",
    "Do you have a name, or can I call you mine?",
    "Do you have a map? Because I keep getting lost in your eyes.",
    "Is your name Google? Because you have everything I’ve been searching for.",
    "If beauty were a crime, you’d be serving a life sentence.",
    "Do you have a Band-Aid? Because I just scraped my knee falling for you.",
    "If you were a vegetable, you’d be a cute-cumber.",
    "Is it okay if I follow you home? Because my parents always told me to follow my dreams.",
    "Are you a Wi-Fi signal? Because I'm feeling a connection.",
    "Do you believe in love at first sight, or should I walk by again?",
    "Can I take you out for dinner? Because I can’t seem to get you out of my mind.",
    "Is there a sparkle in your eye, or are you just happy to see me?",
    "Do you have a sunburn, or are you always this hot?",
    "Are you a parking ticket? Because you’ve got FINE written all over you.",
    "Can you lend me a kiss? I promise I’ll give it back.",
    "Do you have a pencil? Because I want to erase your past and write our future.",
    "You must be a magician, because every time I look at you, everyone else disappears.",
    "Are you made of copper and tellurium? Because you’re Cu-Te.",
    "Do you have an extra heart? Because mine was just stolen.",
    "Is your dad a boxer? Because you’re a knockout!",
    "Do you have a twin? Because I think I’ve just found my better half.",
    "If you were a triangle, you’d be acute one.",
    "Are you a campfire? Because you bring warmth and light to my life.",
    "Is your name Chapstick? Because you’re da balm!",
    "Are you a time traveler? Because I can see you in my future.",
    "Are you a camera? Because every time I look at you, I smile.",
    "If you were a fruit, you’d be a fineapple.",
    "Do you have a mirror in your pocket? Because I can see myself in your pants.",
    "Are you a snowstorm? Because you make my heart race and my cheeks blush.",
    "Is your name Ariel? Because we mermaid for each other.",
    "Are you a light bulb? Because you brighten up my day.",
    "Are you a beaver? Because daaaaam.",
    "If you were a vegetable, you’d be a cutecumber.",
    "Do you like Star Wars? Because Yoda one for me.",
    "Are you a loan from a bank? Because you have my interest.",
    "Is your name Daisy? Because I have a sudden urge to plant you right here.",
    "Are you from Tennessee? Because you’re the only ten I see.",
    "Do you have a quarter? Because I want to call my mom and tell her I met the one.",
    "Are you a magician? Because whenever I look at you, everyone else disappears.",
    "Do you have a sunburn, or are you always this hot?",
    "Is there an airport nearby or is that just my heart taking off?",
    "Do you have a map? Because I keep getting lost in your eyes.",
    "Do you have a name, or can I call you mine?",
    "If beauty were a crime, you’d be serving a life sentence.",
    "Are you a parking ticket? Because you’ve got FINE written all over you.",
    "Can you lend me a kiss? I promise I’ll give it back.",
    "Is your name Google? Because you have everything I’ve been searching for.",
    "Do you have a Band-Aid? Because I just scraped my knee falling for you.",
    "If you were a vegetable, you’d be a cute-cumber.",
    "Is it okay if I follow you home? Because my parents always told me to follow my dreams.",
    "Are you a Wi-Fi signal? Because I'm feeling a connection.",
    "Do you believe in love at first sight, or should I walk by again?",
    "Can I take you out for dinner? Because I can’t seem to get you out of my mind.",
    "Is there a sparkle in your eye, or are you just happy to see me?",
    "Do you have a sunburn, or are you always this hot?",
    "Are you a parking ticket? Because you’ve got FINE written all over you.",
    "Can you lend me a kiss? I promise I’ll give it back.",
    "Do you have a pencil? Because I want to erase your past and write our future.",
    "You must be a magician, because every time I look at you, everyone else disappears.",
    "Are you made of copper and tellurium? Because you’re Cu-Te.",
    "Do you have an extra heart? Because mine was just stolen.",
    "Is your dad a boxer? Because you’re a knockout!",
    "Do you have a twin? Because I think I’ve just found my better half.",
    "If you were a triangle, you’d be acute one.",
    "Are you a campfire? Because you bring warmth and light to my life.",
    "Is your name Chapstick? Because you’re da balm!",
    "Are you a time traveler? Because I can see you in my future.",
    "Are you a camera? Because every time I look at you, I smile.",
    "If you were a fruit, you’d be a fineapple.",
    "Do you have a mirror in your pocket? Because I can see myself in your pants.",
    "Are you a snowstorm? Because you make my heart race and my cheeks blush.",
    "Is your name Ariel? Because we mermaid for each other.",
    "Are you a light bulb? Because you brighten up my day.",
    "Are you a beaver? Because daaaaam.",
    "If you were a vegetable, you’d be a cutecumber.",
    "Do you like Star Wars? Because Yoda one for me.",
    "Are you a loan from a bank? Because you have my interest.",
    "Is your name Daisy? Because I have a sudden urge to plant you right here.",
    "Are you from Tennessee? Because you’re the only ten I see.",
    "Do you have a quarter? Because I want to call my mom and tell her I met the one."
];

let lastMessage = "";
const recentMessages: string[] = [];
const MAX_RECENT_MESSAGES = 10;

function getRandomMessage() {
    let availableMessages: string[] = [];

    if (settings.store.enableDefaultCutieMessages) {
        availableMessages = availableMessages.concat(CUTIE_MESSAGES);
    }

    if (settings.store.customCutieMessages) {
        availableMessages = availableMessages.concat(settings.store.customCutieMessages.split(",").map(msg => msg.trim()));
    }

    if (settings.store.enableRizzMessages) {
        if (settings.store.enableDefaultRizzMessages) {
            availableMessages = availableMessages.concat(RIZZ_MESSAGES);
        }
        if (settings.store.customRizzMessages) {
            availableMessages = availableMessages.concat(settings.store.customRizzMessages.split(",").map(msg => msg.trim()));
        }
    }

    let index;
    let message;

    do {
        index = Math.floor(Math.random() * availableMessages.length);
        message = availableMessages[index];
    } while (message === lastMessage || recentMessages.includes(message));

    lastMessage = message;

    recentMessages.push(message);

    if (recentMessages.length > MAX_RECENT_MESSAGES) {
        recentMessages.shift();
    }

    return message;
}

interface IconProps extends SVGProps<SVGSVGElement> {
    className?: string;
    height?: string | number;
    width?: string | number;
}

function Icon({
    height = 24,
    width = 24,
    className,
    children,
    viewBox,
    ...svgProps
}: React.PropsWithChildren<IconProps & { viewBox: string; }>) {
    return (
        <svg
            className={classes(className, "vc-icon")}
            role="img"
            width={width}
            height={height}
            viewBox={viewBox}
            {...svgProps}
        >
            {children}
        </svg>
    );
}

function CutieIcon() {
    return (
        <Icon viewBox="0 0 576 512">
            <path fill="currentColor" d="M163.9 136.9c-29.4-29.8-29.4-78.2 0-108s77-29.8 106.4 0l17.7 18 17.7-18c29.4-29.8 77-29.8 106.4 0s29.4 78.2 0 108L310.5 240.1c-6.2 6.3-14.3 9.4-22.5 9.4s-16.3-3.1-22.5-9.4L163.9 136.9zM568.2 336.3c13.1 17.8 9.3 42.8-8.5 55.9L433.1 485.5c-23.4 17.2-51.6 26.5-80.7 26.5H192 32c-17.7 0-32-14.3-32-32V416c0-17.7 14.3-32 32-32H68.8l44.9-36c22.7-18.2 50.9-28 80-28H272h16 64c17.7 0 32 14.3 32 32s-14.3 32-32 32H288 272c-8.8 0-16 7.2-16 16s7.2 16 16 16H392.6l119.7-88.2c17.8-13.1 42.8-9.3 55.9 8.5zM193.6 384l0 0-.9 0c.3 0 .6 0 .9 0z" />
        </Icon>
    );
}

const CutieMessengerButton: ChatBarButton = ({ channel }) => {
    const sendCutieMessage = () => {
        const content = getRandomMessage();
        MessageActions.sendMessage(channel.id, { content });
    };

    return (
        <ChatBarButton
            tooltip="Send a cute message"
            onClick={sendCutieMessage}
        >
            <CutieIcon />
        </ChatBarButton>
    );
};

const settings = definePluginSettings({
    customCutieMessages: {
        description: "Add your own custom cutie messages, separated by commas",
        type: OptionType.STRING,
        default: ""
    },
    enableDefaultCutieMessages: {
        description: "When enabled, activates the default integrated 'cutie' messages",
        type: OptionType.BOOLEAN,
        default: true
    },
    customRizzMessages: {
        description: "Add your own custom rizz messages, separated by commas",
        type: OptionType.STRING,
        default: ""
    },
    enableDefaultRizzMessages: {
        description: "When enabled, activates the default 'rizz' messages",
        type: OptionType.BOOLEAN,
        default: true
    },
    enableRizzMessages: {
        description: "Enable sending rizz messages",
        type: OptionType.BOOLEAN,
        default: false
    }
});

export default definePlugin({
    name: "CutieMessenger",
    description: "Adds a button to your chat that, when clicked, sends a random cutie message to the current channel, spreading joy and happiness to everyone 💌",
    authors: [Devs.Prism],
    dependencies: ["ChatInputButtonAPI"],
    settings,

    start() {
        addChatBarButton("CutieMessenger", CutieMessengerButton);
    },

    stop() {
        removeChatBarButton("CutieMessenger");
    }
});