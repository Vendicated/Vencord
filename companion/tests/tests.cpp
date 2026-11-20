#include <cstdio>
#include <string>

#include "json.hpp"

namespace {

int failures = 0;

void check(bool condition, const char* name) {
    if (condition) return;

    fprintf(stderr, "FAIL: %s\n", name);
    failures++;
}

}  // namespace

int main() {
    check(jsonEscape("a\"b\\c\n\t") == "a\\\"b\\\\c\\n\\t", "json escape");

    JsonWriter writer;
    writer.string("type", "hello");
    writer.number("protocol", 1);
    writer.boolean("ok", true);
    writer.beginObject("client");
    writer.null("clientId");
    writer.number("version", 1);
    writer.endObject();

    check(
        writer.finish() == "{\"type\":\"hello\",\"protocol\":1,\"ok\":true,\"client\":{\"clientId\":null,\"version\":1}}",
        "json writer"
    );

    std::string message = "{\"type\":\"ready\",\"gameDetection\":false}";
    const JsonDoc doc = parseJson(message);
    yyjson_val* root = yyjson_doc_get_root(doc.get());
    check(doc != nullptr, "parse json");
    check(jsonString(root, "type") == "ready", "read string");
    check(jsonBool(root, "gameDetection", true) == false, "read bool");

    return failures == 0 ? 0 : 1;
}
