/** Opens `url` in this tab, as a plain click on a link does. */
export function openInThisTab(url: string): void {
  location.assign(url);
}

/**
 * Opens `url` in a new tab beside this one without switching to it, as
 * ⌘/Ctrl+click on a link does. Outside the extension (`ng serve`) there is no
 * tabs API, so the browser opens it in a new tab of its choosing.
 */
export async function openInBackgroundTab(url: string): Promise<void> {
  const tabs = globalThis.chrome?.tabs;
  if (!tabs) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  const current = await tabs.getCurrent();
  await tabs.create({ url, active: false, index: current && current.index + 1, openerTabId: current?.id });
}
