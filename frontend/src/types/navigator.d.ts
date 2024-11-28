// Extend the Navigator interface to include IE-specific download method
interface Navigator {
  msSaveOrOpenBlob?: (blob: Blob, filename?: string) => boolean;
}
