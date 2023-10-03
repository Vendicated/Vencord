# PermissionFreeWill

Removes the client-side restrictions that prevent editing channel permissions, such as permission lockouts ("Pretty sure
you don't want to do this") and onboarding requirements ("Making this change will make your server incompatible [...]")

## Warning

This plugin will let you create permissions in servers that **WILL** lock you out of channels until an administrator
can resolve it for you. Please be careful with the overwrites you are making and check carefully.

## Community Server Channels

Community Server channels (i.e., `#rules` and `#moderator-only`) are actually mandatory and their existence is enforced
by the API, therefore this plugin cannot remove the restrictions behind them.
