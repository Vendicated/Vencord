# syntax=docker/dockerfile:1

FROM alpine:3.22 AS build

RUN apk add --no-cache build-base cmake ninja

WORKDIR /src
COPY . .

RUN cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=MinSizeRel -DVENCORD_RPC_STATIC=ON
RUN cmake --build build
RUN ctest --test-dir build --output-on-failure

FROM scratch AS export
COPY --from=build /src/build/vencord-rpc /vencord-rpc
