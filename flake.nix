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
            # Keep node_modules under build/ so its binaries clear Santa's
            # execution allow-list (see scripts/relocate-node-modules.sh).
            [ -f scripts/relocate-node-modules.sh ] && bash scripts/relocate-node-modules.sh
            echo "Stretchly dev shell — node $(node --version), npm $(npm --version)"
          '';
        };
      });
}
