{
  pkgs,
  mkPnpmPackage,
  revision,
}: rec {
  vencord =
    mkPnpmPackage
    {
      name = "vencord";

      src = ../../.;

      packageJSON = ../../package.json;
      pnpmLock = ../../pnpm-lock.yaml;

      overrides = {
        electron = drv:
          drv.overrideAttrs (old: {
            ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
          });
      };

      nativeBuildInputs = with pkgs; [git];

      buildPhase = ''
        cp -r $PWD/node_modules/vencord/package.json $PWD
        cp -r $PWD/node_modules/vencord/pnpm-lock.yaml $PWD
        cp -r $PWD/node_modules/vencord/build.mjs $PWD
        ${pkgs.nodePackages.pnpm}/bin/pnpm build nix ${revision}
      '';
    };
}
