import type { NetworkMonitor } from '../core';

/** The parts of the Network Information API webOS reads; Chromium has it, other browsers may not. */
interface NetworkInformation extends EventTarget {
  downlink?: number;
  rtt?: number;
}

/**
 * The network connection as the browser sees it: whether it is online, and
 * its estimate of the connection (Network Information API), which Chromium
 * caps at 10 Mbps and rounds for privacy.
 */
export function createNetworkMonitor(): NetworkMonitor {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return {
    read: () => ({
      online: navigator.onLine,
      ...(connection?.downlink !== undefined ? { downlinkMbps: connection.downlink } : {}),
      ...(connection?.rtt !== undefined ? { rttMs: connection.rtt } : {}),
    }),
    onChange(listener) {
      window.addEventListener('online', listener);
      window.addEventListener('offline', listener);
      connection?.addEventListener('change', listener);
      return () => {
        window.removeEventListener('online', listener);
        window.removeEventListener('offline', listener);
        connection?.removeEventListener('change', listener);
      };
    },
  };
}
