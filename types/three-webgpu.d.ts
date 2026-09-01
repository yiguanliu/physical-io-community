// three.js (this version) ships no type declarations, and no @types/three is
// installed, so its subpaths resolve to implicit `any` and `next build` fails
// type-checking (dev doesn't type-check, so it only surfaces on Vercel). These
// ambient declarations let the imports resolve. Robot3D annotates its own local
// three types (see the `T*` aliases there) since three exports none.
declare module "three/webgpu";
declare module "three/tsl";
declare module "three/examples/jsm/*";
declare module "three/addons/*";
