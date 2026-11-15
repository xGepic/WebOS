/** The extension's version from its manifest, e.g. "0.1.0". Undefined outside the extension (`ng serve`). */
export function extensionVersion(): string | undefined {
  return globalThis.chrome?.runtime?.getManifest?.().version;
}
