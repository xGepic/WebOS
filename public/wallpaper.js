// Paints the chosen Wallpaper before webOS starts, so a new tab opens on it
// instead of flashing the default first. webOS keeps this copy of the choice
// (see app.ts); its state is in extension storage, which can't be read in time.
try {
  const wallpaper = localStorage.getItem('webos-wallpaper');
  if (wallpaper) document.documentElement.dataset.wallpaper = wallpaper;
} catch {
  // No copy to read: the default shows until webOS starts.
}
