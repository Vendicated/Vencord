import { BadgePosition, ProfileBadge } from "@api/Badges";
import { hasBadge } from "./index";

const STORE_URL = "https://7tv.app/store";
const BADGE_PROPS = {
    style: {
        transform: "scale(0.8)"
    }
};

const Month1Badge: ProfileBadge = {
    description: "7TV Subscriber - 1 Month",
    image: "https://cdn.7tv.app/badge/62f97c05e46eb00e438a696a/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "7TV Subscriber - 1 Month"),
    link: STORE_URL
};
const Month2Badge: ProfileBadge = {
    description: "7TV Subscriber - 2 Months",
    image: "https://cdn.7tv.app/badge/62f97db2e46eb00e438a696b/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "7TV Subscriber - 2 Months"),
    link: STORE_URL
};
const Month3Badge: ProfileBadge = {
    description: "7TV Subscriber - 3 Months",
    image: "https://cdn.7tv.app/badge/62f97e19e46eb00e438a696c/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "7TV Subscriber - 3 Months"),
    link: STORE_URL
};
const Month6Badge: ProfileBadge = {
    description: "7TV Subscriber - 6 Months",
    image: "https://cdn.7tv.app/badge/62f97e71e46eb00e438a696d/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "7TV Subscriber - 6 Months"),
    link: STORE_URL
};
const Month9Badge: ProfileBadge = {
    description: "7TV Subscriber - 9 Months",
    image: "https://cdn.7tv.app/badge/62f97ebee46eb00e438a696e/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "7TV Subscriber - 9 Months"),
    link: STORE_URL
};
const Year1Badge: ProfileBadge = {
    description: "7TV Subscriber - 1 Year",
    image: "https://cdn.7tv.app/badge/62f97f19e46eb00e438a696f/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "7TV Subscriber - 1 Year"),
    link: STORE_URL
};
const Year1QuarterBadge: ProfileBadge = {
    description: "7TV Subscriber - 1 Year & a Quarter",
    image: "https://cdn.7tv.app/badge/637d53962863630a2d06e27a/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "7TV Subscriber - 1 Year & a Quarter"),
    link: STORE_URL
};
const Year1HalfBadge: ProfileBadge = {
    description: "7TV Subscriber - 1 Year & a Half",
    image: "https://cdn.7tv.app/badge/637d54582863630a2d06e27b/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "7TV Subscriber - 1 Year & a Half"),
    link: STORE_URL
};
const Year1ThreeQuarterBadge: ProfileBadge = {
    description: "7TV Subscriber - 1 Year & Three Quarters",
    image: "https://cdn.7tv.app/badge/64344f93cda636a6910a265f/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "7TV Subscriber - 1 Year & Three Quarters"),
    link: STORE_URL
};

const FounderBadge: ProfileBadge = {
    description: "7TV Founder",
    image: "https://cdn.7tv.app/badge/62f98190e46eb00e438a6970/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "Subscriber - Founder"),
    link: STORE_URL
};

const XMASBadge: ProfileBadge = {
    description: "7TV XMAS Gifter",
    image: "https://cdn.7tv.app/badge/63a66ade919e3d301c52fa84/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "XMAS Gifter"),
    link: STORE_URL
};


const TranslatorBadge: ProfileBadge = {
    description: "7TV Translator",
    image: "https://cdn.7tv.app/badge/62f99d0ce46eb00e438a6984/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "Translator"),
    link: STORE_URL
};
const ContributorBadge: ProfileBadge = {
    description: "7TV Contributor",
    image: "https://cdn.7tv.app/badge/62f99bc1e46eb00e438a6981/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "Contributor"),
    link: STORE_URL
};
const ModeratorBadge: ProfileBadge = {
    description: "7TV Moderator",
    image: "https://cdn.7tv.app/badge/62f98438e46eb00e438a6972/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "Moderator"),
    link: STORE_URL
};
const AdminBadge: ProfileBadge = {
    description: "7TV Admin",
    image: "https://cdn.7tv.app/badge/62f98382e46eb00e438a6971/3x",
    position: BadgePosition.START,
    props: BADGE_PROPS,
    shouldShow: ({ user }) => hasBadge(user.id, "Admin"),
    link: STORE_URL
};

export const SevenTVBadges = [
    Month1Badge,
    Month2Badge,
    Month3Badge,
    Month6Badge,
    Month9Badge,
    Year1Badge,
    FounderBadge,
    ContributorBadge,
    TranslatorBadge,
    Year1QuarterBadge,
    Year1HalfBadge,
    XMASBadge,
    Year1ThreeQuarterBadge,
    ModeratorBadge,
    AdminBadge
];
