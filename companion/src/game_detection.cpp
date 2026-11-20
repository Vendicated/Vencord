#include "game_detection.hpp"

#include <chrono>
#include <condition_variable>
#include <mutex>
#include <unordered_set>
#include <utility>
#include <vector>

#include "json.hpp"
#include "log.hpp"

namespace {

bool isRelevantOS(std::string_view os) {
#ifdef _WIN32
    return os == "win32";
#elif defined(__APPLE__)
    return os == "darwin";
#else
    return os == "win32" || os == "linux";
#endif
}

constexpr bool useSteamApps =
#ifdef __linux__
    true;
#else
    false;
#endif

void addOBS(Database& database) {
    database.addGame("STREAMERMODE", "OBS");
#ifdef _WIN32
    database.addExecutable("win32", "obs.exe", "");
#elif defined(__APPLE__)
    database.addExecutable("darwin", "obs", "");
#else
    database.addExecutable("linux", "obs", "");
#endif
}

template <typename Callback>
void forEach(yyjson_val* array, Callback&& callback) {
    size_t index, max;
    yyjson_val* value;
    yyjson_arr_foreach(array, index, max, value) callback(value);
}

}  // namespace

GameDetection::GameDetection(Callback callback) : callback(std::move(callback)) {}

bool GameDetection::setDatabase(std::string_view json) {
    stop();

    const JsonDoc doc = parseJson(json);
    if (!doc) {
        logMessage("[games] Failed to parse the detectable database");
        return false;
    }

    yyjson_val* root = yyjson_doc_get_root(doc.get());
    if (!yyjson_is_arr(root)) {
        logMessage("[games] The detectable database is not an array");
        return false;
    }

    database = std::make_unique<Database>();
    size_t loaded = 0;
    std::vector<std::string_view> steamApps;
    std::vector<yyjson_val*> executables;

    forEach(root, [&](yyjson_val* entry) {
        const std::string_view id = jsonString(entry, "id");
        const std::string_view name = jsonString(entry, "name");
        if (id.empty() || name.empty()) return;

        steamApps.clear();
        executables.clear();

        if (useSteamApps) {
            forEach(yyjson_obj_get(entry, "third_party_skus"), [&](yyjson_val* sku) {
                const std::string_view appId = jsonString(sku, "id");
                if (jsonString(sku, "distributor") == "steam" && !appId.empty()) steamApps.push_back(appId);
            });
        }

        forEach(yyjson_obj_get(entry, "executables"), [&](yyjson_val* executable) {
            if (jsonBool(executable, "is_launcher", false) || jsonString(executable, "name").empty()) return;
            if (isRelevantOS(jsonString(executable, "os"))) executables.push_back(executable);
        });

        if (steamApps.empty() && executables.empty()) return;

        // Database adds executables and Steam apps to the last added game.
        database->addGame(std::string(id), std::string(name));
        loaded++;

        for (std::string_view appId : steamApps) database->addSteamApp(appId);
        for (yyjson_val* executable : executables) {
            database->addExecutable(
                jsonString(executable, "os"),
                jsonString(executable, "name"),
                std::string(jsonString(executable, "arguments"))
            );
        }
    });

    addOBS(*database);

    logMessage("[games] Loaded %zu of %zu detectable games", loaded, yyjson_arr_size(root));
    return true;
}

bool GameDetection::start() {
    if (thread.joinable() || !database) return false;

    // setDatabase stops the thread before it replaces the database.
    thread = std::jthread([this](std::stop_token stop) {
        using namespace std::chrono_literals;

        std::mutex mutex;
        std::condition_variable_any wake;
        std::unique_lock lock(mutex);

        while (!stop.stop_requested()) {
            scan(*database);
            // A stop request ends the wait early.
            wake.wait_for(lock, stop, 5s, [] { return false; });
        }
    });

    logMessage("[games] Started scanning");
    return true;
}

void GameDetection::stop() {
    const bool wasRunning = thread.joinable();

    // Assigning an empty jthread requests a stop and joins the old thread.
    thread = {};
    games.clear();

    if (wasRunning) logMessage("[games] Stopped scanning");
}

void GameDetection::scan(const Database& db) {
    std::vector<Detection> detections = detect(db);
    std::unordered_set<std::string> active;
    active.reserve(detections.size());

    for (const Detection& detection : detections) {
        const std::string& id = detection.game->id;
        active.insert(id);

        DetectedGame game{ id, detection.game->name, detection.process.pid, detection.process.path };
        auto [existing, inserted] = games.try_emplace(id, game);

        if (inserted) callback(game, true);
        else existing->second = std::move(game);
    }

    std::erase_if(games, [&](const auto& entry) {
        if (active.contains(entry.first)) return false;

        callback(entry.second, false);
        return true;
    });
}
