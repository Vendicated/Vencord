# The glossary contains commonly used or agreed translations for words. This is used to cut down on the amount of
# repeated strings shared between Vencord and plugins, and makes reusing them easy.
#
# Since this is a glossary for other translations and are loaded with every context, they are made into terms so that
# they cannot be used by developers directly, but rather need to be interpolated into messages. For example:
#
#    vencord-appreciation = I love {-vencord}!
#
# is the correct way of using the `-vencord` term since `-vencord` is not accessible from the translation function.
#
# This glossary is the reference glossary. Since languages are complex, some glossaries may have a different set of
# facets or terms to make it more compatible with that language (not one size fits all after all!) and the appropriate
# translation files will need to account for that. Every language, however, should have at least a minimal glossary.
#
# For translators, if a glossary contains the word in the context you need it in, use the glossary. If it doesn't due to
# a grammatical issue, it is preferred to extend the glossary with a new facet for the context you need to use it in for
# future use in other translations. If you see a commonly repeated word or phrase that might benefit from being in the
# glossary, please open an issue on GitHub to discuss it since we need to look into moving it into the glossary for
# other languages as well.

-vencord = Vencord
