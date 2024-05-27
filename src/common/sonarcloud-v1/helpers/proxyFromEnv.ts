import { URL } from "url";

function formatHostname(hostname: string) {
  // canonicalize the hostname, so that 'oogle.com' won't match 'google.com'
  return hostname.replace(/^\.*/, ".").toLowerCase();
}

function parseNoProxyZone(zone: string) {
  zone = zone.trim().toLowerCase();

  const zoneParts = zone.split(":", 2);
  const zoneHost = formatHostname(zoneParts[0]);
  const zonePort = zoneParts[1];
  const hasPort = zone.indexOf(":") > -1;

  return { hostname: zoneHost, port: zonePort, hasPort };
}

function uriInNoProxy(url: URL, noProxy: string) {
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  const hostname = formatHostname(url.hostname);
  const noProxyList = noProxy.split(",");

  // iterate through the noProxyList until it finds a match.
  return noProxyList.map(parseNoProxyZone).some((noProxyZone) => {
    const isMatchedAt = hostname.indexOf(noProxyZone.hostname);
    const hostnameMatched =
      isMatchedAt > -1 && isMatchedAt === hostname.length - noProxyZone.hostname.length;

    if (noProxyZone.hasPort) {
      return port === noProxyZone.port && hostnameMatched;
    }

    return hostnameMatched;
  });
}

// This function is duplicated based on request library logic.
// When https protocol is used by destination endpoint we allow using proxy from both
// HTTP_PROXY and HTTPS_PROXY environment constiables.
export function getProxyFromURI(url: URL) {
  // Decide the proper request proxy to use based on the request URI object and the
  // environmental constiables (NO_PROXY, HTTP_PROXY, etc.)
  // respect NO_PROXY environment constiables (see: https://lynx.invisible-island.net/lynx2.8.7/breakout/lynx_help/keystrokes/environments.html)

  const noProxy = process.env.NO_PROXY || process.env.no_proxy || "";

  // if the noProxy is a wildcard then return null

  if (noProxy === "*") {
    return null;
  }

  // if the noProxy is not empty and the uri is found return null

  if (noProxy !== "" && uriInNoProxy(url, noProxy)) {
    return null;
  }

  // Check for HTTP or HTTPS Proxy in environment Else default to null

  if (url.protocol === "http:") {
    return process.env.HTTP_PROXY || process.env.http_proxy || null;
  }

  if (url.protocol === "https:") {
    return (
      process.env.HTTPS_PROXY ||
      process.env.https_proxy ||
      process.env.HTTP_PROXY ||
      process.env.http_proxy ||
      null
    );
  }

  // if none of that works, return null
  // (What uri protocol are you using then?)

  return null;
}
