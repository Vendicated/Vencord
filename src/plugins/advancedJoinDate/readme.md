# AdvancedJoinDate

> Discord's Member Since is basically useless. This fixes that.

Displays exact join dates and times across user popups, DM sidebar, and full profile modals with server icon, account creation date, hover-to-relative, and more.

![popup preview](screenshots/popup.png)

---

## what it does

- **server join date** — shown with the server's icon (or initials if there's no icon)
- **account creation date** — calculated from the snowflake ID, no API needed
- **hover to see relative time** — e.g. `3 years, 47 days, 12 hours`
- **right-click to copy** — formatted date, relative time, or unix timestamp
- **new account warning** — optional flag for accounts younger than X days
- works in popups, DM sidebar, full profiles, and the overflow menu

---

## settings

| option | description |
|---|---|
| Date style | `15 Jan` / `15 January` / locale numeric / ISO 8601 |
| Time | toggle on/off, seconds, milliseconds, timezone |
| Hour cycle | locale default, 12h, or 24h |
| Hover relative | show relative time on hover |
| New account threshold | warn if account is younger than N days |
| Show/hide per location | popups, sidebar, full profile independently |

---

## authors

[ZanuZoss](https://github.com/ZanuZoss)
