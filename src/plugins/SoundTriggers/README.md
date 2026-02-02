# SoundTriggers Plugin

This plugin triggers a sound when you send a message containing certain strings. The triggers are customizable through regular expressions and can be set through the plugin settings.

## Features

- **Customizable Sound Triggers**: Define sound triggers by specifying a match pattern and a corresponding audio file link. Supports regular expressions for advanced pattern matching.
- **Volume Control**: Adjust the notification volume for the triggered sounds.
- **Default Triggers**: Includes a set of default triggers that can be customized or extended via the plugin settings.
- **Sound Playback**: Automatically plays a sound when a message matches a defined trigger.
- **Error Handling**: Gracefully handles playback errors if the audio file is unavailable.

## Installation

1. Download or clone this repository to your local machine.
2. Add the plugin to your plugin directory.
3. Ensure all dependencies are installed.

https://discord.com/channels/1015060230222131221/1257038407503446176

## Usage

Once installed, the plugin will automatically trigger sounds when certain strings are detected in messages. By default, the plugin comes with the following triggers:

- **"crack"**: Plays a sound from [bau.mp3](https://files.catbox.moe/yauk4d.ogg).
- **Regex for "husk"**: Plays a sound from [orbqe6.mp3](https://files.catbox.moe/orbqe6.mp3) when the term "husk" appears in certain formats, such as `:husk:` or `[husk](https://link.com)`.

### Customizing Triggers

You can customize the triggers by going to the plugin settings:

1. Navigate to the **SoundTriggers** plugin settings.
2. In the **Triggers** field, enter your custom triggers in the format:  
   `match:link,match:link,...`
   - Example:  
     `crack:https://link-to-your-audio.mp3,word:https://another-audio.mp3`
3. The `match` can be a regular expression, and the `link` should be the URL to the audio file.

### Volume Control

- The **Volume** setting allows you to adjust the playback volume. The volume can be set between 0 and 100, with 100 being the default volume level.

## Configuration Settings

- **Volume**: Set the volume of the sound notifications (range: 0 - 100).
- **Triggers**: A comma-separated list of custom sound triggers in the format `match:link`. This allows you to define additional patterns and corresponding sound URLs.

## Example of Custom Trigger

To add a custom trigger for the word "cheer", you would enter the following in the **Triggers** setting:
```
cheer:https://files.catbox.moe/cheer.mp3
```

This will play the specified sound whenever the word "cheer" appears in any message.

## Example Regex Trigger

You can also use regular expressions to trigger sounds. For example, the following regex will match any mention of "husk" surrounded by colons or links:

```
(:[^:\\s]*husk[^:\\s]*:)|\\[[^\\]]*husk[^\\]]*\\]\\([^()\\s]*\\)
```

This will trigger the corresponding sound defined in the plugin.

## Notes

- The plugin uses the HTML `<audio>` element to play the sounds. Ensure that the audio links provided are publicly accessible.
- You can use regular expressions to match more complex patterns in messages.
- The audio files should be accessible via URLs (e.g., direct HTTP links to `.mp3` or `.ogg` files).
