import {defaultRules} from "./defaultRules";
import {
    addPreSendListener,
    addPreEditListener,
    MessageObject,
    removePreSendListener,
    removePreEditListener,
} from "../../api/MessageEvents";
import definePlugin from "../../utils/types";

export default definePlugin({
    name: "clearURLs",
    description: "Removes tracking garbage from URLs",
    authors: [
        {
            name: "adryd",
            id: 0n,
        },
    ],
    dependencies: ["MessageEventsAPI"],

    createRules() {
        // Can be extended upon once user configs are available
        // Eg. (useDefaultRules: boolean, customRules: Array[string])
        const rules = defaultRules;

        this.universalRules = new Set();
        this.rulesByHost = new Map();
        this.hostRules = new Map();

        for (const rule of rules) {
            let paramRule;
            let hostRule;
            const splitRule = rule.split("@");
            paramRule = splitRule[0];

            paramRule = new RegExp("^" + paramRule.replace(/[#-}]/g, '\\$&').replace(/\\\*/, ".+?") + "$");

            if (splitRule[1]) {
                hostRule = new RegExp(
                    "^(www\\.)?" +
                        splitRule[1]
                            .replace(/[#-}]/g, '\\$&')
                            .replace(/\\\./, "\\.")
                            .replace(/^\\\*\\\./, "(.+?\\.)?")
                            .replace(/\\\*/, ".+?") +
                        "$"
                );
            } else {
                this.universalRules.add(paramRule);
                continue;
            }

            let hostRuleIndex = hostRule.toString();

            this.hostRules.set(hostRuleIndex, hostRule);
            if (this.rulesByHost.get(hostRuleIndex) == null) {
                this.rulesByHost.set(hostRuleIndex, new Set());
            }
            this.rulesByHost.get(hostRuleIndex).add(paramRule);
        }
    },

    removeParam(rule, param, parent) {
        if (param == rule || (rule.test && rule.test(param))) {
            parent.delete(param);
        }
    },

    replacer(match: string) {
        let url;

        // Parse URL without throwing errors
        try {
            url = new URL(match);
        } catch (error) {
            // Don't modify anything if we can't parse the URL
            return match;
        }

        // Cheap way to check if there are any search params
        if (url.searchParams.entries().next().done) {
            // If there are none, we don't need to modify anything
            return match;
        }

        // Check all universal rules
        this.universalRules.forEach((rule) => {
            url.searchParams.forEach((_value, param, parent) => {
                this.removeParam(rule, param, parent);
            });
        });

        // Check rules for each hosts that match
        this.hostRules.forEach((regex, hostRuleName) => {
            if (!regex.test(url.hostname)) return;
            this.rulesByHost.get(hostRuleName).forEach((rule) => {
                url.searchParams.forEach((_value, param, parent) => {
                    this.removeParam(rule, param, parent);
                });
            });
        });

        return url.toString();
    },

    onSend(msg: MessageObject) {
        // Only run on messages that contain URLs
        if (msg.content.match(/http(s)?:\/\//)) {
            msg.content = msg.content.replace(
                /(https?:\/\/[^\s<]+[^<.,:;"'>)|\]\s])/g,
                (match) => this.replacer(match)
            );
        }
    },

    start() {
        this.createRules();
        this.preSend = addPreSendListener((_, msg) => this.onSend(msg));
        this.preEdit = addPreEditListener((_cid, _mid, msg) =>
            this.onSend(msg)
        );
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    },
});
