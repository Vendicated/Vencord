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

      nativeBuildInputs = [pkgs.git];

      buildPhase = ''
        ${pkgs.nodePackages.pnpm}/bin/pnpm build nix ${revision}
      '';
    };
}
