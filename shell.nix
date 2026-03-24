{
  nixpkgs ? import <nixpkgs> { },
}:
nixpkgs.mkShell {
  buildInputs = with nixpkgs; [
    nodejs_24
  ];
}
