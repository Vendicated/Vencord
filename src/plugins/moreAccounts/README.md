# MoreAccounts

removes the 5 account limit on the account switcher

discord lets you sign in to 5 accounts, then it just starts evicting older ones every time you connect. the token stays in storage so the account isn't really logged out, it just disappears from the dropdown. you have to log in again to bring it back.

this patches both. the trim is removed and the "add an account" button stops erroring at 5.

## settings
- **Max Accounts**: number, default 50. won't go below 5
- **Auto-restore** runs once when you connect, re-adds accounts that got evicted before you had this. on by default
- a **Restore hidden accounts** button below if you want to run it manually

restore reads the stored tokens, hits `/users/@me` for each one to get the username and check if it's still valid, then puts them back. expired tokens show the normal red "please log in again". nothing ever gets removed.

made this because i had 7 accounts and discord kept dropping 2 of them on restart. tested on canary, windows.
