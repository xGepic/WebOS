import type { WebOSCore } from '../../webos-core';

/** Downloads a backup file of all webOS data, which counts as the last backup. */
export function saveBackup(webos: WebOSCore): void {
  const backup = webos.exportBackup();
  if (!backup) return;
  const url = URL.createObjectURL(new Blob([backup.text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = backup.fileName;
  link.click();
  // The download has started from the URL; it can go once the click has been handled.
  setTimeout(() => URL.revokeObjectURL(url));
}
