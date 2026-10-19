declare module "virtual:asset-sizes" {
  // Byte size of each tracked asset, keyed by its source file name.
  const sizes: Record<string, number>;
  export default sizes;
}
