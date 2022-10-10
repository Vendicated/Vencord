{
  description = "A Discord client mod that does things differently";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
    ...
  } @ inputs: let
    forAllSystems = nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed;
  in {
    packages = forAllSystems (system: let
      pkgs = import nixpkgs {
        inherit system;
        config.allowUnfree = true;
      };
    in {
      discord-patched = pkgs.callPackage ./scripts/nix/discord-patched.nix {};
      vencord = pkgs.callPackage ./scripts/nix/vencord.nix {};
    });
  };
}
