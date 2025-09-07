import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import { findByProps } from "@webpack";
import { Button, Forms, Text, TextInput, RelationshipStore, UserStore } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { useState, useEffect } from "@webpack/common";
import { Settings } from "@api/Settings";

interface FilterRule {
    pattern: string;
    type: "hide" | "anyOrder";
    enabled: boolean;
}

const settings = definePluginSettings({
    rules: {
        type: OptionType.COMPONENT,
        component: () => {
            const [rules, setRules] = useState<FilterRule[]>([]);

            // Initialize rules from settings
            useEffect(() => {
                try {
                    const storedRules = Settings.plugins.messageFilter?.rules;
                    if (Array.isArray(storedRules)) {
                        setRules(storedRules);
                    }
                } catch (e) {
                    console.error("Error loading rules:", e);
                }
            }, []);

            // Update settings when rules change
            useEffect(() => {
                try {
                    if (Array.isArray(rules)) {
                        Settings.plugins.messageFilter.rules = rules;
                    }
                } catch (e) {
                    console.error("Error saving rules:", e);
                }
            }, [rules]);

            const handleAddRule = () => {
                setRules(prev => [...(Array.isArray(prev) ? prev : []), { pattern: "", type: "hide", enabled: true }]);
            };

            const handleDeleteRule = (index: number) => {
                setRules(prev => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== index));
            };

            const handlePatternChange = (index: number, value: string) => {
                setRules(prev => {
                    if (!Array.isArray(prev)) return [];
                    const newRules = [...prev];
                    newRules[index] = { ...newRules[index], pattern: value };
                    return newRules;
                });
            };

            const handleTypeChange = (index: number, value: "hide" | "anyOrder") => {
                setRules(prev => {
                    if (!Array.isArray(prev)) return [];
                    const newRules = [...prev];
                    newRules[index] = { ...newRules[index], type: value };
                    return newRules;
                });
            };

            return (
                <div className="vc-message-filter-settings">
                    <Forms.FormSection>
                        <Forms.FormTitle>Filter Rules</Forms.FormTitle>
                        <Forms.FormText>
                            Add rules to filter messages. Friends' messages are always shown.
                        </Forms.FormText>

                        <Forms.FormText style={{ marginTop: "5px", color: "var(--text-muted)" }}>
                            <strong>Examples:</strong>
                            <div style={{ marginTop: "10px" }}>
                                <strong>Regex Patterns:</strong>
                                <ul style={{ marginTop: "5px", marginLeft: "20px" }}>
                                    <li><code>word1|word2</code> - Message contains either word</li>
                                    <li><code>word1.*word2</code> - Matches both words in sequence</li>
                                    <li><code>\bword\b</code> - Message contains word only</li>
                                </ul>
                                <strong style={{ display: "block", marginTop: "10px" }}>Words in Any Order:</strong>
                                <ul style={{ marginTop: "5px", marginLeft: "20px" }}>
                                    <li><code>word1 word2</code> - Hides message if both words appear in any order</li>
                                </ul>
                            </div>
                        </Forms.FormText>

                        {Array.isArray(rules) && rules.map((rule, index) => (
                            <div key={index} className="vc-message-filter-rule" style={{ marginBottom: "10px" }}>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <TextInput
                                        value={rule.pattern}
                                        onChange={value => handlePatternChange(index, value)}
                                        placeholder={rule.type === "anyOrder" ? "Words to match (space separated)" : "Regex pattern"}
                                        style={{ flex: 1 }}
                                    />
                                    <select
                                        value={rule.type}
                                        onChange={e => handleTypeChange(index, e.target.value as "hide" | "anyOrder")}
                                        style={{ width: "150px" }}
                                    >
                                        <option value="hide">Hide Message (Regex)</option>
                                        <option value="anyOrder">Hide Message (Any Order)</option>
                                    </select>
                                    <Button
                                        size={Button.Sizes.SMALL}
                                        color={Button.Colors.RED}
                                        onClick={() => handleDeleteRule(index)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <Button
                            onClick={handleAddRule}
                            style={{ marginTop: "10px" }}
                        >
                            Add Rule
                        </Button>
                    </Forms.FormSection>
                </div>
            );
        },
        default: [] as FilterRule[]
    }
});

export default definePlugin({
    name: "MessageFilter",
    description: "Filter messages based on regex patterns or words in any order",
    authors: [Devs.sapphicwaters],
    settings,
    dependencies: ["MessageDecorationsAPI"],

    patches: [
        {
            find: ".__invalid_blocked,",
            replacement: [
                {
                    match: /let{expanded:\i,[^}]*?collapsedReason[^}]*}/,
                    replace: "if($self.filterMessage(arguments[0]))return null;$&"
                }
            ]
        },
        {
            find: '"MessageStore"',
            replacement: [
                {
                    match: /(?<=function (\i)\((\i)\){)(?=.*MESSAGE_CREATE:\1)/,
                    replace: (_, _funcName, props) => `if($self.shouldIgnoreMessage(${props}.message))return;`
                }
            ]
        }
    ],

    shouldIgnoreMessage(message) {
        try {
            if (message.author?.id) {
                if (RelationshipStore.isFriend(message.author.id) || message.author.id === UserStore.getCurrentUser()?.id) return false;
            }

            const rules = Array.isArray(Settings.plugins.messageFilter?.rules) ?
                Settings.plugins.messageFilter.rules.filter(rule => rule.enabled) : [];

            for (const rule of rules) {
                try {
                    if (rule.type === "hide") {
                        const regex = new RegExp(rule.pattern, "i");
                        if (regex.test(message.content)) {
                            return true; // Hide the message
                        }
                    } else if (rule.type === "anyOrder") {
                        const words = rule.pattern.split(/\s+/).filter(w => w.length > 0);
                        if (words.length === 0) continue;

                        // Check if all words are present in any order
                        const allWordsPresent = words.every(word =>
                            new RegExp(`\\b${word}\\b`, "i").test(message.content)
                        );

                        if (allWordsPresent) {
                            return true; // Hide the message
                        }
                    }
                } catch (e) {
                    console.error("Invalid pattern:", rule.pattern);
                }
            }
        } catch (e) {
            console.error("Error in shouldIgnoreMessage:", e);
        }

        return false;
    },

    filterMessage(props) {
        try {
            const message = props.message;
            if (!message) return false;

            // Skip if message is from a friend or the current user
            if (message.author?.id) {
                if (RelationshipStore.isFriend(message.author.id) || message.author.id === UserStore.getCurrentUser()?.id) return false;
            }

            const rules = Array.isArray(Settings.plugins.messageFilter?.rules) ?
                Settings.plugins.messageFilter.rules.filter(rule => rule.enabled) : [];

            for (const rule of rules) {
                try {
                    if (rule.type === "hide") {
                        const regex = new RegExp(rule.pattern, "i");
                        if (regex.test(message.content)) {
                            return true;
                        }
                    } else if (rule.type === "anyOrder") {
                        const words = rule.pattern.split(/\s+/).filter(w => w.length > 0);
                        if (words.length === 0) continue;

                        // Check if all words are present in any order
                        const allWordsPresent = words.every(word =>
                            new RegExp(`\\b${word}\\b`, "i").test(message.content)
                        );

                        if (allWordsPresent) {
                            return true;
                        }
                    }
                } catch (e) {
                    console.error("Invalid pattern:", rule.pattern);
                }
            }
        } catch (e) {
            console.error("Error in filterMessage:", e);
        }

        return false;
    }
}); 
