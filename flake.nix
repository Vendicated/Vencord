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
    in rec {
      discord-patched = pkgs.callPackage ./scripts/nix/discord-patched.nix {inherit vencord;};
      vencord = pkgs.callPackage ./scripts/nix/vencord.nix {
        revision =
          if self ? rev
          then self.rev
          else "dev";
      };
    });
  };
}
