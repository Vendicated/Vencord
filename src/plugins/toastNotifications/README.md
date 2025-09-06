# ToastNotifications

Displays a pop-up notification for incoming private messages in a configurable position on screen, otherwise known as a _'toast'_ notification.

-   [Configuration](#-configuration)
    -   [Notification Position](#notification-position)
    -   [Ignored Users](#ignored-users)
    -   [Respect Do Not Disturb](#respect-do-not-disturb)
    -   [Disable While Screen Sharing](#disable-while-screen-sharing)
    -   [Disable In Streamer Mode](#disable-in-streamer-mode)
    -   [Notification Timeout](#notification-timeout)
    -   [Opacity](#opacity)
    -   [Max Notifications](#max-notifications)
-   [Theming](#-theming)

## 🔧 Configuration

### Notification Position

Determines which corner of your screen the notification will appear in, valid options are:

-   Bottom Left _(Default)_
-   Bottom Right
-   Top Left
-   Top Right

### Ignored Users

A comma-separated list of Discord User IDs whose messages will not trigger a notification. This is useful for ignoring messages from users who are not important to you or who send too many messages. Example value:

-   `123456789012345678,234567890123456789,345678901234567890`

The above example will ignore messages from the users with IDs `123456789012345678`, `234567890123456789`, and `345678901234567890`. You can find a user's ID by right-clicking on their name in Discord and selecting <kbd>Copy ID</kbd> _(Developer Mode must be enabled in Discord settings)_.

### Respect Do Not Disturb

If enabled, notifications will not be shown when your Discord status is set to Do Not Disturb mode.

### Disable While Screen Sharing

When enabled, notifications will not be shown when you are screen sharing in any voice channel, useful for preventing notifications from appearing on the screen you are sharing.

## Disable In Streamer Mode

When enabled, notifications will not be shown when your Discord is in streamer mode.

### Notification Timeout

The duration _(in seconds)_ for which notifications will be shown on the screen before disappearing, a progress bar is shown below notifications to indicate how long is left before they disappear.

> [!NOTE]
> You can hover over a notification while it is visible to pause the timeout and keep it on screen indefinitely until you move your mouse away from it again.

### Opacity

The visible opacity of the notification message to display, acceptable value is between 10% and 100%.

### Max Notifications

The maximum number of concurrent notifications to display on the screen at once, if this limit is reached, the oldest notification will be removed from the screen to make room for the new one.

---

## 🎨 Theming

This plugin supports theming and exposes a number of CSS variables to allow you to customize the appearance of notifications.

| CSS Variable                            | Description                                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `toastnotifications-background-color`   | The background color of the main notification container.                                                                                                           |
| `toastnotifications-text-color`         | The color for the text inside the notification.                                                                                                                    |
| `toastnotifications-border-radius`      | The border radius of the main notification container.                                                                                                              |
| `toastnotifications-width`              | The width constraint of notification embeds within the container, adjusting this may cause notifications to overflow so only adjust if you know what you're doing. |
| `toastnotifications-min-width`          | The minimum width to use for all notifications, regardless of the content.                                                                                         |
| `toastnotifications-max-width`          | The maximum width a single notification can be.                                                                                                                    |
| `toastnotifications-min-height`         | The minimum height to use for all notifications, regardless of the content.                                                                                        |
| `toastnotifications-max-height`         | The maximum height a single notification can be.                                                                                                                   |
| `toastnotifications-padding`            | The padding value to use for notifications within the container.                                                                                                   |
| `toastnotifications-progressbar-height` | The height of the progress bar shown below notifications which denotes their remaining timeout.                                                                    |
| `toastnotifications-progressbar-color`  | The color of the timeout progress bar.                                                                                                                             |
