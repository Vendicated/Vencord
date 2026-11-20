#include "host.hpp"

#include <charconv>
#include <cstdint>
#include <optional>
#include <string>
#include <string_view>

#include "json.hpp"
#include "log.hpp"
#include "platform.hpp"
#include "protocol.hpp"

namespace {

std::optional<uint64_t> parseId(std::string_view text) {
    uint64_t value;
    const char* end = text.data() + text.size();
    auto [last, error] = std::from_chars(text.data(), end, value);
    if (error != std::errc() || last != end) return std::nullopt;

    return value;
}

}  // namespace

Host::Host() : ipc(*this), detection([this](const DetectedGame& game, bool running) { onGame(game, running); }) {}

int Host::run() {
    setLogFile(dataDir() / "host.log");

    {
        JsonWriter json;
        json.string("type", "hello");
        json.number("protocol", PROTOCOL_VERSION);
        json.string("version", VENCORD_RPC_VERSION);
        json.string("installPath", pathToUtf8(executablePath()));
        json.boolean("gameDetection", true);
        send(json.finish());
    }

    std::string message;
    while (native.read(message)) handleMessage(message);

    detection.stop();
    ipc.stop();
    return 0;
}

void Host::handleMessage(std::string_view message) {
    const JsonDoc doc = parseJson(message);
    if (!doc) {
        logMessage("Failed to parse a native message");
        return;
    }

    yyjson_val* root = yyjson_doc_get_root(doc.get());
    const std::string_view type = jsonString(root, "type");

    if (type == "ready") {
        onReady(jsonBool(root, "gameDetection", true));
    } else if (type == "configure") {
        const bool enabled = jsonBool(root, "gameDetection", true);
        if (rendererReady && enabled != wantGameDetection) setGameDetection(enabled);
    } else if (type == "detectable-db") {
        const std::string_view database = jsonString(root, "json");
        if (database.empty()) {
            logMessage("The extension sent no detectable database: %s", std::string(jsonString(root, "error")).c_str());
            return;
        }

        if (detection.setDatabase(database) && rendererReady && wantGameDetection) detection.start();
    } else if (type == "rpc-send") {
        const auto id = parseId(jsonString(root, "id"));
        const std::string_view payload = jsonString(root, "json");
        if (id && !payload.empty()) ipc.send(*id, std::string(payload));
    } else if (type == "rpc-close") {
        const auto id = parseId(jsonString(root, "id"));
        const int code = (int)jsonInt(root, "code", CLOSE_NORMAL);
        if (id) ipc.close(*id, code, std::string(jsonString(root, "message")));
    } else if (type == "stop") {
        rendererReady = false;
        detection.stop();
        ipc.stop();
        ipcStarted = false;
        sendType("games-reset");
    } else if (type == "ping") {
        sendType("pong");
    }
}

void Host::onReady(bool gameDetection) {
    rendererReady = true;

    if (!ipcStarted) ipcStarted = ipc.start();
    else ipc.closeAll(CLOSE_NORMAL, "Renderer reloaded");

    sendType("games-reset");
    setGameDetection(gameDetection);
}

void Host::setGameDetection(bool enabled) {
    wantGameDetection = enabled;
    detection.stop();

    if (enabled) detection.start();
    else sendType("games-reset");
}

void Host::onGame(const DetectedGame& game, bool running) {
    JsonWriter json;
    json.string("type", "game");
    json.beginObject("game");
    json.string("id", game.id);
    json.string("name", game.name);
    json.number("pid", game.pid);
    json.string("path", game.path);
    json.endObject();
    json.boolean("running", running);
    send(json.finish());
}

void Host::onIpcConnect(uint64_t id, const std::string& clientId, int version) {
    JsonWriter json;
    json.string("type", "rpc-connect");
    json.string("id", std::to_string(id));
    json.beginObject("client");

    if (clientId.empty()) json.null("clientId");
    else json.string("clientId", clientId);

    json.number("version", version);
    json.endObject();
    send(json.finish());
}

void Host::onIpcRequest(uint64_t id, const std::string& payload) {
    JsonWriter json;
    json.string("type", "rpc-request");
    json.string("id", std::to_string(id));
    json.string("payload", payload);
    send(json.finish());
}

void Host::onIpcDisconnect(uint64_t id) {
    JsonWriter json;
    json.string("type", "rpc-disconnect");
    json.string("id", std::to_string(id));
    send(json.finish());
}

void Host::send(const std::string& json) {
    native.write(json);
}

void Host::sendType(const char* type) {
    JsonWriter json;
    json.string("type", type);
    send(json.finish());
}
