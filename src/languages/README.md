# This is not official, but working (maybe there are bugs, but I did not find) version of Vencord. Russian translation has been added and you can select the language in the Vecncord settings. Here a catalog of languages ​​has been added, a new tab for selecting a language in the settings, the contents of the tabs have been translated. In the future, I plan to add translation to all plugins (I have already started). I hope this version will get into the official repository>_<.


# How to use this?

- It's simple - you need to determine which directory you are in. So far, translation is supported in three folders: `api`, `components` and `plugins`. You also need to have a JSON file with your translations.

- Next, you can use the `getLanguage()` or `defineLanguage()` function.
   - `getLanguage()` requires only one parameter - the name of the directory you are in.
   - `defineLanguage()` requires the name of your plugin (P.S.: recommended for use only in plugins) and an object with language files in the format `{ language: translation file }`.

- I hope this information was useful for you<3.


