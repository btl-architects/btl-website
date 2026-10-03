# Readiness follow-up — 3 October 2026

## Published-content repairs

- ELLE DECOR: `/press/elle-decor-nelly-house/`.
- Architectural Digest: `/press/architectural-digest-nelly-house/`.
- Sanity has an editable, validated and unique Press web-address field. The
  previous internal-ID URLs redirect, and later published slug changes retain
  their previous addresses automatically.
- Each founder has one person record, supplying both Home and People. Team
  portraits and Principal Architect designations were preserved. Home
  designation visibility defaults off; its left-to-right name order is
  independent of People roster order. The consolidation used revision guards,
  checked drafts/references and saved a private backup before deleting duplicates.
- The deployed Studio includes these fields and ordering changes.
- Press artwork analysis removes only transparent outer padding at build time.
  Opaque borders, lettering and photographs remain intact. Captions follow the
  photograph hotspot after that trim, with one shared gap above/below the row.

## Delivery and measured performance

Mobile image candidates now include 720 and 1080 pixels, retaining quality 82,
full desktop resolution and the original-source cap. The same Satoshi variable
font is divided into common and extended glyphs. The generated stylesheet is
embedded on every entry page. The common font arrives with the page when the
result stays below 55 KB gzipped; larger indexes keep the cached font request.
This reserves 5 KB below the existing 60 KB page budget. Extended glyphs remain
available on demand. Initial project content does not wait for scroll entrances.

Cold mobile Lighthouse measurements against the deployed immutable preview
`https://10b8cc2d.btl-website-3wo.pages.dev` (commit `e91f1dc`):

| Page | Three LCP runs (ms) | Median LCP | Performance | Maximum CLS |
| --- | --- | --- | --- | --- |
| Home | 1169 / 1178 / 1179 | 1178 ms | 100 | 0.000515 |
| Nelly House | 1735 / 990 / 1025 | 1025 ms | 100 | 0.005531 |
| Contact | 1532 / 962 / 963 | 963 ms | 100 | 0.000289 |

Before embedding the common font, the preceding deployed preview medians were
2251 / 2529 / 1421 ms respectively. The original live Nelly House measurement
before this follow-up was 2845 ms. Network timing varies; these measurements are
lab evidence, not a guarantee for every visitor. Localhost scores are not used
as the launch pass.

CI waits for the exact source commit's Cloudflare deployment, then measures
three cold mobile runs against its immutable URL. It gates median LCP under
2000 ms, median performance at least 95, and maximum CLS under 0.02. No target
was relaxed.

Web unit tests, Studio unit tests/type checking, build/content/transport/image
checks passed. Chrome and Safari checks cover Press alignment, reader controls,
redirects, consolidated founder cards and video playback. Safari measurements
wait for the browser's responsive layout frame after changing viewport size.

## Remaining external items

Domain and mail activation are deferred by the owner; follow
[the domain and mail handoff](domain-and-mail-setup.md). The site continues using
its working Pages origin. Google Workspace admin access is still needed to
activate DKIM signing.

The TypeScript 7 Dependabot PRs #10 and #11 are closed. Both packages ignore
TypeScript 7 until Astro's checker supports it.

Existing dependency audit failures remain visible: Astro's dependency on
http-cache-semantics 4.2.0 (GHSA-ch52-4w7c-c8xp), and Studio CLI's dependency on
braces 3.0.3 (GHSA-vfj7-8cjw-p6xm). Tests and performance now run before those
checks so the audit failures cannot hide unrelated regressions. No suppression,
audit exception, downgrade or security patch is claimed by this follow-up.
