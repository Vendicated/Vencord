# BackgroundImageURL

Change a theme's background image from plugin settings without editing its CSS file.

## Usage

Open **Settings → Vencord → Plugins → BackgroundImageURL**. Set **Background URL** to a direct HTTP(S) image link. Set **CSS variable** to the custom property your theme uses for its background image. The default is `--background-image-url`.

For example, if a theme defines `--my-theme-bg: url("...")`, enter `--my-theme-bg`. Clear **Background URL** to let the theme's own value take effect again.

The selected property is set on `body`, so the theme must use it there or inherit it on its background element. Themes that hard-code `background-image: url(...)` without a configurable custom property need a CSS change to use this plugin. The image URL must be publicly accessible and directly return an image.
