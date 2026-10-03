# Development address cleanup — 3 October 2026

The current Sanity project, person, category and location records were checked
against their editorial names. Only address fields changed; record IDs, images,
ordering and references were preserved. A private backup precedes the guarded
transaction. No draft content was published.

| Record | Corrected slug |
| --- | --- |
| Teak and Terra | `teak-and-terra` |
| House of Threaded Time | `house-of-threaded-time` |
| Yadukrishnan | `yadukrishnan` |
| Swabah Hajir T K | `swabah-hajir-t-k` |
| Ismail M | `ismail-m` |

Nelly House, The Conservatory, the categories, locations and remaining existing
people slugs already match their names. Founders have separate principal profile
records with their correct slugs; their additional roster records do not need
competing profile addresses. People pages require biographies as well as slugs,
so this cleanup does not invent individual profiles.

At the user's request, this development cleanup adds no redirects. The existing
project publishing action still preserves addresses for subsequent public slug
changes. The one-time cleanup is not an automatic title-to-address synchronizer:
once public links are established, title edits should keep their existing URLs.

To review the current content again, from `studio/`:

```sh
npx sanity exec scripts/repair-slugs.ts --with-user-token
```

`-- --apply` updates only the reported address fields with revision guards and a
private local backup. It rejects unsafe, conflicting or reserved addresses and
requires a separate redirect review before changing an existing person profile.
