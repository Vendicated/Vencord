# Fix script, to convert string IDs to numeric IDs in constants.ts after sorting and converting with YAML sorter and JSON converter
# Suggested tools:
## https://tools.ddd-cloud.de/yaml-prettify
## https://tools.ddd-cloud.de/yaml-to-json-converter
sed -i 's/"id": "\([0-9]*n\)"/"id": \1/g' constants.ts