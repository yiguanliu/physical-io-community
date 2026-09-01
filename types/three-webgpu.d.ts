// three's WebGPU build (`three/webgpu`) does not ship type declarations for
// this subpath in the version we use, so under `strict` TypeScript it resolves
// to an implicit `any` and `next build` fails during type-checking (dev doesn't
// type-check, which is why it only surfaces on Vercel). Declaring the module
// here lets it resolve cleanly. Runtime typing is unaffected.
declare module "three/webgpu";
