# Translating ArabicUI

Mostly JSON. No coding.

Write plain Arabic. If it sounds weird out loud, rewrite it.

Plugin titles stay English. Descriptions and settings are Arabic.

## Loanwords

Keep the English sound, write Arabic letters. No Latin. No English in parentheses.

| English | Write |
|---------|--------|
| Discord | دسكورد |
| BetterDiscord | بيتر ديسكورد |
| Vencord | فينكورد |
| Nitro | نيترو |
| Server / Guild | سيرفر |
| Boost | بوست |
| Mute / Unmute | ميوت / فك الميوت |
| Deafen | ديفن |
| Ban / Banned | باند / مبند |
| Kick | كيك |
| Timeout | تايم اوت |
| Spam | سبام |
| Bot | بوت |
| Mod / Moderator | مود / مودريتر |
| Admin | ادمن |
| Online / Offline | اونلاين / اوفلاين |
| Banner / Badge | بانر / بادج |
| Sticker / Emoji | ستيكر / ايموجي |
| Thread / Forum | ثريد / فورم |
| Theme / Plugin | ثيم / بلوقن |
| Overlay | اوفرلاي |
| Webhook | ويب هوك |
| Spotify / YouTube / Twitch / Patreon | سبوتفاي / يوتيوب / تويتش / باتريون |
| Board | بورد |
| Wishlist | قائمة الرغبات |
| DM / DMs | خاص / الخاص |
| GIF / GIFs | صورة متحركة / صور متحركة |
| Rich Presence | حالة النشاط |
| Quest | كويست |

Wrong: `الكتم (Mute)` · Right: `الميوت`

Normal Arabic stays normal (قناة، رسالة، دعوة…).

Connected Accounts = linked accounts (متصل), not اونلاين.

Full list: `locales/glossary.json`

## Add a Discord string

1. Copy the English from Discord exactly.
2. Put it in `locales/discord/en-text/` (pick a topic file, or use `extras.json`).

| File | Scope |
|------|--------|
| `chat.json` | messages, replies, composer |
| `chrome.json` | tabs, buttons, shell |
| `server.json` | servers, members, mod tools |
| `settings.json` | user / app settings |
| `social.json` | friends, activity, profile |
| `media.json` | images, embeds |
| `voice_video.json` | voice, video, stream |
| `extras.json` | leftovers |

```json
"Wishlist": "قائمة الرغبات",
"Mute": "ميوت"
```

Keep `{placeholders}` unchanged. One English key in one file. Do not edit `_all.json`.

```bash
node scripts/arabicUi/normalizeLoanwords.mjs
node scripts/arabicUi/dedupeEnText.mjs
node scripts/arabicUi/mergeEnText.mjs
```

- `normalizeLoanwords` — glossary style
- `dedupeEnText` — one file per key
- `mergeEnText` — rebuilds `_all.json` and updates `locales/meta.json`

Then build / inject and check in Discord.

Short single words (Board, Wishlist…): if merge skips them, add the word once to `engine/chromeAllowlist.json`, then merge again. Do not edit allowlists in `lookup.ts` or `mergeEnText.mjs` — both load that file.

Optional: `getUntranslatedArabicUiStrings()` in the Discord console lists misses.

## Plugin packs

1. Copy `_template.json` → `ExactPluginName.json`
2. Fill `description` and `settings`
3. `node scripts/arabicUi/generateRegistry.mjs`
4. Build / inject

```json
{
  "description": "وصف الإضافة بالعربي.",
  "settings": {
    "someOptionId": "وصف الخيار بالعربي"
  }
}
```

## PRs

Target: [viciouscal/Vencord](https://github.com/viciouscal/Vencord)

PRs welcome.

**mar** · [github.com/n0tmar](https://github.com/n0tmar)
