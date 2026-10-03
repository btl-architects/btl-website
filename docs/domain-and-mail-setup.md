# Domain and mail activation

3 October 2026: domain login is deferred at the owner's request. The website
continues using its working Pages origin until the custom domain serves valid
HTTPS. Do not switch canonicals or add a host redirect before then.

The hosting login is `studio.betweenthelines@gmail.com`, account
`6cc96a72451e2f1b48fa2443465c9b15`, Pages project `btl-website`. Its API access
currently returns no `btldesigns.in` zone. Public nameservers are Cloudflare's
`angela.ns.cloudflare.com` and `arch.ns.cloudflare.com`. Apex and www have no web
records. Existing Google MX and SPF records must be retained.

1. Sign in to the account that lists the active `btldesigns.in` zone. Determine
   whether it belongs to the hosting account; access to another account does
   not move a zone between accounts. An apex Pages domain requires the zone
   and Pages project in the same account. If different, choose an explicit
   account migration or use a www subdomain first; do not recreate a live zone
   or change nameservers without preserving its complete DNS configuration.
2. Attach the chosen hostname in Pages → Custom domains, then add/confirm its
   CNAME to `btl-website-3wo.pages.dev`. Verify authoritative DNS, the Pages
   domain status, certificate and real page responses before changing `SITE_URL`.
3. Set the verified canonical HTTPS origin as production `SITE_URL`, rebuild,
   and verify canonical links, share links, sitemap, robots and enquiry success
   URLs. Redirect the exact production Pages hostname and alternate www/apex
   hostname, preserving paths and queries. Keep preview hosts usable and noindex.
4. The BTL Google Workspace administrator opens Apps → Google Workspace →
   Gmail → Authenticate email, selects `btldesigns.in`, and generates a
   2048-bit DKIM record. Add Google's exact selector and TXT public key in DNS.
   Once visible, the administrator selects Start authentication. A DNS record
   alone does not enable Google's message signing. Verify a real message's
   Authentication-Results for DKIM and SPF; no outbound email is sent by these
   website changes.
5. Add one `_dmarc` TXT record beginning with `v=DMARC1; p=none`, with aggregate
   reporting to an inbox BTL confirms it will monitor. After DKIM alignment and
   all legitimate senders are verified, review reports before advancing to
   quarantine/reject. A monitoring policy does not itself prevent spoofing.

References: [Cloudflare domain requirements](https://developers.cloudflare.com/pages/configuration/custom-domains/),
[Pages host redirects](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/),
[Google DKIM setup](https://support.google.com/a/answer/180504),
[Google DMARC setup](https://support.google.com/a/answer/2466580).
