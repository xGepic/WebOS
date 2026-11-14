import { FetchError, type CalendarAccount, type CalendarServer, type RemoteCalendar } from '../core';

/** Where every iCloud account's CalDAV starts; each account's calendars then live on its own `pNN-caldav.icloud.com`. */
const ICLOUD = 'https://caldav.icloud.com/';
/** How long one request may take before it counts as failed. A calendar with years of events can be slow. */
const TIMEOUT_MS = 30_000;

const DAV = 'DAV:';
const CALDAV = 'urn:ietf:params:xml:ns:caldav';
const APPLE = 'http://apple.com/ns/ical/';

/**
 * The user's iCloud calendars over CalDAV, read-only, for Apple Calendar.
 * Signs in with Basic authentication (Apple ID and app-specific password) and
 * sends no cookies. Works in the extension only, which may reach
 * `*.icloud.com`: a normal tab is stopped by CORS.
 */
export function createICloudCalendar(): CalendarServer {
  /** Each account's calendar home, found once per tab. */
  const homes = new Map<string, string>();

  async function home(account: CalendarAccount): Promise<string> {
    const key = `${account.appleId}\n${account.password}`;
    const known = homes.get(key);
    if (known) return known;
    const root = await dav(account, ICLOUD, 'PROPFIND', '0', propfind(`<d:current-user-principal/>`));
    const principal = hrefIn(root, DAV, 'current-user-principal');
    if (!principal) throw new Error('iCloud gave no principal for this account.');
    const found = await dav(account, principal, 'PROPFIND', '0', propfind(`<c:calendar-home-set/>`));
    const calendarHome = hrefIn(found, CALDAV, 'calendar-home-set');
    if (!calendarHome) throw new Error('iCloud gave no calendar home for this account.');
    homes.set(key, calendarHome);
    return calendarHome;
  }

  return {
    async calendars(account) {
      const calendarHome = await home(account);
      const listing = await dav(
        account,
        calendarHome,
        'PROPFIND',
        '1',
        propfind(`<d:displayname/><d:resourcetype/><c:supported-calendar-component-set/><a:calendar-color/>`),
      );
      const calendars: RemoteCalendar[] = [];
      for (const { href, prop } of responses(listing)) {
        if (!prop || !child(child(prop, DAV, 'resourcetype'), CALDAV, 'calendar')) continue;
        const components = child(prop, CALDAV, 'supported-calendar-component-set');
        const comps = components ? [...components.getElementsByTagNameNS(CALDAV, 'comp')].map((comp) => comp.getAttribute('name')) : [];
        if (comps.length && !comps.includes('VEVENT')) continue;
        const color = cssColor(text(child(prop, APPLE, 'calendar-color')));
        calendars.push({
          url: href,
          name: text(child(prop, DAV, 'displayname')) || 'Calendar',
          ...(color ? { color } : {}),
        });
      }
      return calendars;
    },

    async events(account, calendarUrl, { start, end }) {
      const report = await dav(
        account,
        calendarUrl,
        'REPORT',
        '1',
        `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="${CALDAV}">
  <d:prop><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${utc(start)}" end="${utc(end)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`,
      );
      return responses(report).flatMap(({ prop }) => {
        const data = text(child(prop, CALDAV, 'calendar-data'));
        return data ? [data] : [];
      });
    },
  };
}

/** A PROPFIND body asking for `props`. */
const propfind = (props: string) =>
  `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:" xmlns:c="${CALDAV}" xmlns:a="${APPLE}"><d:prop>${props}</d:prop></d:propfind>`;

/** A multistatus answer, with the address it came from, to resolve relative hrefs against. */
interface Answer {
  document: Document;
  url: string;
}

async function dav(account: CalendarAccount, url: string, method: 'PROPFIND' | 'REPORT', depth: '0' | '1', body: string): Promise<Answer> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${base64(`${account.appleId}:${account.password}`)}`,
      Depth: depth,
      'Content-Type': 'application/xml; charset=utf-8',
    },
    body,
    credentials: 'omit',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new FetchError(response.status, `${new URL(url).host} answered ${response.status}`);
  const document = new DOMParser().parseFromString(await response.text(), 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error(`${new URL(url).host} answered with XML webOS can't read.`);
  return { document, url: response.url || url };
}

/** Each `response` in a multistatus answer: its absolute href and the properties it found (status 200). */
function responses({ document, url }: Answer): { href: string; prop: Element | undefined }[] {
  return [...document.getElementsByTagNameNS(DAV, 'response')].flatMap((response) => {
    const href = text(child(response, DAV, 'href'));
    if (!href) return [];
    const found = [...response.getElementsByTagNameNS(DAV, 'propstat')].find((propstat) => /\s200\s/.test(` ${text(child(propstat, DAV, 'status'))} `));
    return [{ href: new URL(href, url).href, prop: found ? child(found, DAV, 'prop') : undefined }];
  });
}

/** The absolute href inside the first `namespace`:`name` property of an answer, e.g. the principal. */
function hrefIn(answer: Answer, namespace: string, name: string): string | undefined {
  const property = answer.document.getElementsByTagNameNS(namespace, name)[0];
  const href = text(child(property, DAV, 'href'));
  return href ? new URL(href, answer.url).href : undefined;
}

/** The first child element of `parent` named `namespace`:`name`. */
function child(parent: Element | undefined, namespace: string, name: string): Element | undefined {
  if (!parent) return undefined;
  return [...parent.children].find((element) => element.namespaceURI === namespace && element.localName === name);
}

const text = (element: Element | undefined) => element?.textContent?.trim() ?? '';

/** Apple's "#1BADF8FF" (with alpha) as "#1badf8"; anything that isn't a hex colour as undefined. */
function cssColor(value: string): string | undefined {
  const match = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(value);
  return match ? `#${match[1].toLowerCase()}` : undefined;
}

/** A moment as CalDAV time ranges take it: `20261001T000000Z`. */
const utc = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** UTF-8 text as Base64, for Basic authentication. */
const base64 = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value)));
