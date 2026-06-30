# TenorCord

A Vencord plugin that adds (back) Tenor GIF support to Discord.

## Configuration

| Setting | Default                                                 | Description         |
| ------- | ------------------------------------------------------- | ------------------- |
| API URL | `https://tenor-api.happyendermandev.workers.dev/api/v9` | Tenor API proxy URL |

### Self hosting

If you want to host your own API proxy:

1. Clone the [tenor-worker](https://codeberg.org/wavedevgit/tenor-worker) repository
2. Deploy to Cloudflare Workers
3. Update the API URL in plugin settings

## How it works

Discord's GIF picker uses klipy now. This plugin redirects those requests to your own proxy server, which fetches GIFs from Tenor.
