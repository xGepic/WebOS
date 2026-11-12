/** What the user enters for a Link. */
export interface LinkInput {
  title: string;
  url: string;
}

/** A curated URL saved in webOS. Distinct from a browser bookmark. */
export interface Link extends LinkInput {
  id: string;
}

/** A named section of Links. Groups and the Links in them are kept in display order. */
export interface LinkGroup {
  id: string;
  name: string;
  links: Link[];
}

const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i;
const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * A URL without a scheme gets `http://` for localhost and IP addresses (local
 * dev servers rarely have TLS), and `https://` otherwise.
 */
export function normalizeUrl(typed: string): string {
  const url = typed.trim();
  if (hasScheme.test(url)) return url;
  return `${isLocalOrIp(hostOf(url)) ? 'http' : 'https'}://${url}`;
}

/** The host part of a scheme-less URL, without port or credentials. */
function hostOf(url: string): string {
  const authority = url.split(/[/?#]/, 1)[0];
  const hostAndPort = authority.slice(authority.lastIndexOf('@') + 1);
  if (hostAndPort.startsWith('[')) return hostAndPort.slice(0, hostAndPort.indexOf(']') + 1);
  return hostAndPort.split(':', 1)[0].toLowerCase();
}

function isLocalOrIp(host: string): boolean {
  return host === 'localhost' || host.endsWith('.localhost') || ipv4.test(host) || host.startsWith('[');
}

/** A Link as stored: trimmed title, normalised URL. */
function toLink(id: string, { title, url }: LinkInput): Link {
  return { id, title: title.trim(), url: normalizeUrl(url) };
}

/** Returns `items` with `item` inserted at `index`, clamped to the list. */
function insertAt<T>(items: readonly T[], index: number, item: T): T[] {
  const at = Math.max(0, Math.min(index, items.length));
  return [...items.slice(0, at), item, ...items.slice(at)];
}

export function addGroup(groups: readonly LinkGroup[], id: string, name: string): LinkGroup[] {
  return [...groups, { id, name: name.trim(), links: [] }];
}

export function addLink(groups: readonly LinkGroup[], groupId: string, id: string, input: LinkInput): LinkGroup[] {
  return groups.map((group) =>
    group.id === groupId ? { ...group, links: [...group.links, toLink(id, input)] } : group,
  );
}

export function moveGroup(groups: readonly LinkGroup[], groupId: string, toIndex: number): LinkGroup[] {
  const group = groups.find((candidate) => candidate.id === groupId);
  if (!group) return [...groups];
  return insertAt(
    groups.filter((candidate) => candidate !== group),
    toIndex,
    group,
  );
}

/** Moves a Link to `toIndex` in `toGroupId`, which may be the Link Group it is already in. */
export function moveLink(groups: readonly LinkGroup[], linkId: string, toGroupId: string, toIndex: number): LinkGroup[] {
  const link = groups.flatMap((group) => group.links).find((candidate) => candidate.id === linkId);
  if (!link || !groups.some((group) => group.id === toGroupId)) return [...groups];

  return groups.map((group) => {
    const links = group.links.filter((candidate) => candidate.id !== linkId);
    if (group.id !== toGroupId) return links.length === group.links.length ? group : { ...group, links };
    return { ...group, links: insertAt(links, toIndex, link) };
  });
}

export function renameGroup(groups: readonly LinkGroup[], groupId: string, name: string): LinkGroup[] {
  return groups.map((group) => (group.id === groupId ? { ...group, name: name.trim() } : group));
}

export function editLink(groups: readonly LinkGroup[], linkId: string, input: LinkInput): LinkGroup[] {
  return groups.map((group) => ({
    ...group,
    links: group.links.map((link) => (link.id === linkId ? toLink(linkId, input) : link)),
  }));
}

export function deleteLink(groups: readonly LinkGroup[], linkId: string): LinkGroup[] {
  return groups.map((group) => ({ ...group, links: group.links.filter((link) => link.id !== linkId) }));
}

/** Deletes a Link Group and every Link in it. */
export function deleteGroup(groups: readonly LinkGroup[], groupId: string): LinkGroup[] {
  return groups.filter((group) => group.id !== groupId);
}
