import type { Rule } from "./types.ts";
import { parseHosts } from "./hosts.ts";

// Top essential Ad, Tracker, Malware, and Phishing host signatures
// Compiled from StevenBlack hosts & URLhaus signatures for instant client-side execution
const SEED_HOSTS_TEXT = `
# StevenBlack Ads & Trackers Essential Seed
0.0.0.0 doubleclick.net
0.0.0.0 adservice.google.com
0.0.0.0 pagead2.googlesyndication.com
0.0.0.0 google-analytics.com
0.0.0.0 googletagmanager.com
0.0.0.0 adnxs.com
0.0.0.0 criteo.com
0.0.0.0 criteo.net
0.0.0.0 clarity.ms
0.0.0.0 hotjar.com
0.0.0.0 scorecardresearch.com
0.0.0.0 amazon-adsystem.com
0.0.0.0 ads.pubmatic.com
0.0.0.0 openx.net
0.0.0.0 taboola.com
0.0.0.0 outbrain.com
0.0.0.0 rubiconproject.com
0.0.0.0 popads.net
0.0.0.0 adpushup.com
0.0.0.0 track.adform.net
0.0.0.0 telemetry.facebook.com
0.0.0.0 pixel.facebook.com
0.0.0.0 connect.facebook.net
0.0.0.0 ads-twitter.com
0.0.0.0 static.ads-twitter.com
0.0.0.0 metrics.icloud.com
0.0.0.0 telemetry.microsoft.com
0.0.0.0 vortex.data.microsoft.com
0.0.0.0 smartadserver.com
0.0.0.0 analytics.tiktok.com
0.0.0.0 log.byteoversea.com
`;

const MALWARE_HOSTS_TEXT = `
# URLhaus Malware & Phishing Essential Seed
0.0.0.0 urlhaus-test.malware
0.0.0.0 malware-traffic-analysis.net
0.0.0.0 test-malware.zone
0.0.0.0 bad-payload.defense
0.0.0.0 payload-delivery.xyz
0.0.0.0 ransomware-tracker.top
0.0.0.0 trojan-downloader.biz
0.0.0.0 spyware-collector.info
0.0.0.0 fake-update-chrome.org
0.0.0.0 evil-crypto-drainer.click
`;

export function getBuiltinRules(): Rule[] {
  const adRules = parseHosts(SEED_HOSTS_TEXT, "ads", 1);
  const malwareRules = parseHosts(MALWARE_HOSTS_TEXT, "malware", 1000);
  return [...adRules, ...malwareRules];
}
