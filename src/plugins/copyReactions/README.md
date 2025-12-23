# Copy Reactions as JSON

A Vencord plugin that allows you to export Discord message reactions with detailed user information as JSON.

## Features

- **Context Menu Integration**: Right-click any message with reactions to access the "Copy Reactions as JSON" option
- **Individual User Data**: Fetches complete user information for each reaction, including:
  - User ID
  - Username
  - Display name
- **Smart Display**: Only shows the context menu option when a message has reactions
- **Complete Emoji Info**: Captures both custom and Unicode emojis with proper formatting

## Usage

1. Right-click on any message that has reactions
2. Click "Copy Reactions as JSON" from the context menu
3. The reaction data is copied to your clipboard as formatted JSON

## Output Format

```json
{
  "messageId": "1234567890",
  "channelId": "9876543210",
  "reactions": [
    {
      "emoji": {
        "id": "123456789",
        "name": "custom_emoji",
        "animated": false,
        "formatted": "<:custom_emoji:123456789>"
      },
      "count": 2,
      "users": [
        {
          "id": "111111111",
          "username": "user1",
          "displayName": "User One"
        },
        {
          "id": "222222222",
          "username": "user2",
          "displayName": "User Two"
        }
      ]
    }
  ],
  "totalReactions": 2,
  "totalUniqueUsers": 2
}
```


## License

GPL-3.0-or-later (follows Vencord's license)
