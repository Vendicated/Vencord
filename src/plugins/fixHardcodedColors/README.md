Discord often hardcodes colors despite having css variables for all it's colors.

For example, `--primary-160` is `#ebedef`.

But in the code, they have hardcoded the color hex instead of using the variable
```css
.defaultLightModeCustomGradient_e77fa3 {
    background: linear-gradient(rgba(0,0,0,0) 20%, #ebedef 100%);
}
```

This causes issues for theme devs who want to make stuff by directly modifying color variables as they need to manually fix all these problems.

This is very prevalent when using ClientTheme and looking at "channels and roles"
![Discord_tn6oWjipFv](https://github.com/Vendicated/Vencord/assets/37855219/e74e41af-b277-4b28-83be-f87807bad16d)

This plugin addresses this issue by generating css to make the problematic code use color variables instead, for example:
```css
.defaultLightModeCustomGradient_e77fa3 {
    background: linear-gradient(rgba(0,0,0,0) 20%, var(--primary-160) 100%);
}
```
