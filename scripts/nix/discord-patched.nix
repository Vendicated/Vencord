{
  pkgs,
  lib,
  symlinkJoin,
  discord-canary,
  makeBinaryWrapper,
  writeShellScript,
  vencord,
  withOpenAsar ? false,
}: let
  extractCmd =
    makeBinaryWrapper.extractCmd
    or (writeShellScript "extract-binary-wrapper-cmd" ''
      strings -dw "$1" | sed -n '/^makeCWrapper/,/^$/ p'
    '');
  # I'll do this properly later
  openAsar = builtins.fetchurl {
    name = "app.asar";
    url = "https://github.com/LunNova/replugged-nix-flake/raw/openasar/app.asar";
    sha256 = "sha256:0mkvmy9fhqmj7z3lfrm38a5nf62s251da9957sgfj9nw23ydqmlp";
  };
in
  symlinkJoin {
    name = "vencord";
    paths = [discord-canary.out];

    postBuild =
      ''
        mkdir -p $out/opt/DiscordCanary/resources/app
        echo -e 'require("../dist/patcher.js");\nrequire("../app.asar");' > $out/opt/DiscordCanary/resources/app/index.js
        echo -e '{ "name": "discord", "main": "index.js" }' > $out/opt/DiscordCanary/resources/app/package.json
        cp -r '${vencord.vencord}/libexec/vencord/deps/vencord/dist' $out/opt/DiscordCanary/resources/dist

        cp -a --remove-destination $(readlink "$out/opt/DiscordCanary/.DiscordCanary-wrapped") "$out/opt/DiscordCanary/.DiscordCanary-wrapped"
        cp -a --remove-destination $(readlink "$out/opt/DiscordCanary/DiscordCanary") "$out/opt/DiscordCanary/DiscordCanary"

        if grep '\0' $out/opt/DiscordCanary/DiscordCanary && wrapperCmd=$(${extractCmd} $out/opt/DiscordCanary/DiscordCanary) && [[ $wrapperCmd ]]; then
          parseMakeCWrapperCall() {
              shift
              oldExe=$1; shift
              oldWrapperArgs=("$@")
          }
          eval "parseMakeCWrapperCall ''${wrapperCmd//"${discord-canary.out}"/"$out"}"
          makeWrapper $oldExe $out/opt/DiscordCanary/DiscordCanary "''${oldWrapperArgs[@]}"
        else
          substituteInPlace $out/opt/DiscordCanary/DiscordCanary \
          --replace '${discord-canary.out}' "$out"
        fi

        substituteInPlace $out/opt/DiscordCanary/DiscordCanary --replace '${discord-canary.out}' "$out"
      ''
      + (lib.optionalString withOpenAsar ''
        rm $out/opt/Discord${discordPathSuffix}/resources/app.asar
        cp ${openAsar} $out/opt/Discord${discordPathSuffix}/resources/app.asar
      '');

    meta.mainProgram =
      if (discord-canary.meta ? mainProgram)
      then discord-canary.meta.mainProgram
      else null;
  }
