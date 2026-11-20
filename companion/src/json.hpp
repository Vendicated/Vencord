#pragma once

#include <cstdint>
#include <memory>
#include <string>
#include <string_view>

#include <yyjson.h>

std::string jsonEscape(std::string_view text);

class JsonWriter {
public:
    void string(const char* key, std::string_view value);
    void number(const char* key, int64_t value);
    void boolean(const char* key, bool value);
    void null(const char* key);
    void beginObject(const char* key);
    void endObject();
    std::string finish();

private:
    void key(const char* key);

    std::string out = "{";
};

using JsonDoc = std::unique_ptr<yyjson_doc, decltype([](yyjson_doc* doc) { yyjson_doc_free(doc); })>;

// Return an empty JsonDoc if the text is not valid JSON.
inline JsonDoc parseJson(std::string_view text) {
    return JsonDoc(yyjson_read(text.data(), text.size(), 0));
}

std::string_view jsonString(yyjson_val* object, const char* key);
bool jsonBool(yyjson_val* object, const char* key, bool fallback);
int64_t jsonInt(yyjson_val* object, const char* key, int64_t fallback);
