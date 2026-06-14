{
  description = "Stretchly — the break time reminder app (dev tooling)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          # Node 24.15.0 here matches .nvmrc exactly.
          packages = [
            pkgs.nodejs_24
            pkgs.python3 # node-gyp, for the native deps (node-desktop-idle-v2, *-notification-state)
            pkgs.git # husky prepare hook + general dev use inside the shell
          ];

          shellHook = ''
            echo "Stretchly dev shell — node $(node --version), npm $(npm --version)"
          '';
        };
      });
}
