# Vencord WebRPC companion
# Copyright (c) 2026 Vendicated and contributors
# SPDX-License-Identifier: GPL-3.0-or-later

cmake_minimum_required(VERSION 3.24)

project(vencord-rpc VERSION 0.2.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_INTERPROCEDURAL_OPTIMIZATION ON)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE MinSizeRel)
endif()

find_package(Threads REQUIRED)

if(MSVC)
    set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
    string(REPLACE "/EHsc" "" CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}")
    string(REPLACE "/GR" "" CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}")
    add_compile_options(
        /utf-8 /W4 /permissive-
        $<$<COMPILE_LANGUAGE:CXX>:/GR->
        $<$<COMPILE_LANGUAGE:CXX>:/EHs-c->
        $<$<NOT:$<CONFIG:Debug>>:/O1>
        $<$<NOT:$<CONFIG:Debug>>:/Gy>
        $<$<NOT:$<CONFIG:Debug>>:/Gw>
    )
    add_link_options(
        $<$<NOT:$<CONFIG:Debug>>:/OPT:REF>
        $<$<NOT:$<CONFIG:Debug>>:/OPT:ICF>
    )
    add_compile_definitions(NOMINMAX WIN32_LEAN_AND_MEAN UNICODE _UNICODE _HAS_EXCEPTIONS=0)
else()
    add_compile_options(
        -Os
        -ffunction-sections
        -fdata-sections
        -fno-ident
        $<$<COMPILE_LANGUAGE:CXX>:-fno-rtti>
        $<$<COMPILE_LANGUAGE:CXX>:-fno-exceptions>
    )
    if(APPLE)
        add_link_options(-Wl,-dead_strip)
    else()
        add_compile_options(-fno-asynchronous-unwind-tables -fno-unwind-tables)
        add_link_options(-Wl,--gc-sections -s -Wl,--build-id=none -Wl,-z,noseparate-code)
    endif()
endif()

# Game detection core. addon.cc is intentionally excluded because it is N-API glue.
add_library(game-detection STATIC
    vendor/game-detection/src/matcher.cc
)
target_include_directories(game-detection PUBLIC vendor/game-detection/src)
target_compile_features(game-detection PUBLIC cxx_std_20)

if(WIN32)
    target_sources(game-detection PRIVATE vendor/game-detection/src/process_win.cc)
    target_compile_definitions(game-detection PUBLIC NOMINMAX WIN32_LEAN_AND_MEAN)
    target_link_libraries(game-detection PUBLIC ntdll user32)
elseif(APPLE)
    target_sources(game-detection PRIVATE vendor/game-detection/src/process_mac.cc)
    target_link_libraries(game-detection PUBLIC "-lproc")
else()
    target_sources(game-detection PRIVATE vendor/game-detection/src/process_linux.cc)
endif()

set(YYJSON_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(YYJSON_BUILD_FUZZER OFF CACHE BOOL "" FORCE)
set(YYJSON_BUILD_MISC OFF CACHE BOOL "" FORCE)
set(YYJSON_BUILD_DOC OFF CACHE BOOL "" FORCE)
set(YYJSON_INSTALL OFF CACHE BOOL "" FORCE)
set(YYJSON_DISABLE_WRITER ON CACHE BOOL "" FORCE)
set(YYJSON_DISABLE_UTILS ON CACHE BOOL "" FORCE)
set(YYJSON_DISABLE_FILE ON CACHE BOOL "" FORCE)
set(YYJSON_DISABLE_INCR_READER ON CACHE BOOL "" FORCE)
set(YYJSON_DISABLE_FAST_FP_CONV ON CACHE BOOL "" FORCE)
add_subdirectory(vendor/yyjson EXCLUDE_FROM_ALL)

add_executable(vencord-rpc
    src/main.cpp
    src/host.cpp
    src/native_messaging.cpp
    src/discord_ipc.cpp
    src/game_detection.cpp
    src/json.cpp
    src/log.cpp
    src/platform.cpp
)

if(WIN32)
    target_sources(vencord-rpc PRIVATE src/platform_win.cpp)
else()
    target_sources(vencord-rpc PRIVATE src/platform_posix.cpp)
endif()

target_link_libraries(vencord-rpc PRIVATE game-detection yyjson Threads::Threads)
target_compile_definitions(vencord-rpc PRIVATE VENCORD_RPC_VERSION="${PROJECT_VERSION}")

if(WIN32)
    set_target_properties(vencord-rpc PROPERTIES WIN32_EXECUTABLE TRUE)
    target_link_libraries(vencord-rpc PRIVATE advapi32 shell32)
endif()

option(VENCORD_RPC_STATIC "Link the Linux binary statically" OFF)
if(VENCORD_RPC_STATIC AND NOT WIN32 AND NOT APPLE)
    target_link_options(vencord-rpc PRIVATE -static)
endif()

enable_testing()

add_executable(vencord-rpc-tests
    tests/tests.cpp
    src/json.cpp
)
target_link_libraries(vencord-rpc-tests PRIVATE yyjson)
target_include_directories(vencord-rpc-tests PRIVATE src)
target_compile_definitions(vencord-rpc-tests PRIVATE VENCORD_RPC_VERSION="${PROJECT_VERSION}")
add_test(NAME vencord-rpc-tests COMMAND vencord-rpc-tests)
