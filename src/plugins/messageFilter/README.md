# MessageFilter

A plugin that allows you to filter messages based on regex patterns or words in any order.

## Features

- Hide messages containing specific regex patterns
- Hide messages containing specific words in any order
- Friends' messages are always shown
- Persistent settings that survive Discord restarts
- Easy-to-use settings UI

## Usage

1. Enable the plugin in Vencord settings
2. Go to the plugin settings
3. Add a new rule by clicking "Add Rule"
4. Choose between two types of rules:
   - **Hide Message (Regex)**: Use regex patterns to match messages
   - **Hide Message (Any Order)**: Enter words separated by spaces to match messages containing all words in any order

### Regex Examples
- `word1|word2` - Matches either word
- `word1.*word2` - Matches both words in sequence
- `\bword\b` - Matches whole word only

### Any Order Examples
- `word1 word2` - Hides message if both words appear in any order
- `word1 word2 word3` - Hides message if all three words appear in any order

## Settings

The plugin settings allow you to:
- Add new filter rules
- Delete existing rules
- Choose between regex and word-based filtering
- Configure patterns for each rule

## Notes

- Messages from friends are never filtered
- Rules are case-insensitive
- Invalid regex patterns will be logged to the console
- Settings are automatically saved and persist between Discord restarts 