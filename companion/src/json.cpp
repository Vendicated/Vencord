#include "json.hpp"

std::string jsonEscape(std::string_view text) {
    constexpr char HEX[] = "0123456789abcdef";

    std::string out;
    out.reserve(text.size() + 8);

    for (unsigned char c : text) {
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b"; break;
            case '\f': out += "\\f"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                if (c < 0x20) {
                    out += "\\u00";
                    out += HEX[c >> 4];
                    out += HEX[c & 0xf];
                } else {
                    out += static_cast<char>(c);
                }
        }
    }

    return out;
}

void JsonWriter::key(const char* name) {
    // A key follows either the opening brace of an object or a previous value.
    if (out.back() != '{') out += ',';

    out += '"';
    out += name;
    out += "\":";
}

void JsonWriter::string(const char* name, std::string_view value) {
    key(name);
    out += '"';
    out += jsonEscape(value);
    out += '"';
}

void JsonWriter::number(const char* name, int64_t value) {
    key(name);
    out += std::to_string(value);
}

void JsonWriter::boolean(const char* name, bool value) {
    key(name);
    out += value ? "true" : "false";
}

void JsonWriter::null(const char* name) {
    key(name);
    out += "null";
}

void JsonWriter::beginObject(const char* name) {
    key(name);
    out += '{';
}

void JsonWriter::endObject() {
    out += '}';
}

std::string JsonWriter::finish() {
    out += '}';
    return out;
}

std::string_view jsonString(yyjson_val* object, const char* name) {
    yyjson_val* value = yyjson_obj_get(object, name);
    if (!yyjson_is_str(value)) return {};

    return { yyjson_get_str(value), yyjson_get_len(value) };
}

bool jsonBool(yyjson_val* object, const char* name, bool fallback) {
    yyjson_val* value = yyjson_obj_get(object, name);
    return yyjson_is_bool(value) ? yyjson_get_bool(value) : fallback;
}

int64_t jsonInt(yyjson_val* object, const char* name, int64_t fallback) {
    yyjson_val* value = yyjson_obj_get(object, name);
    return yyjson_is_int(value) ? yyjson_get_sint(value) : fallback;
}
