# Client feedback, second round — 2 October 2026

Implemented on `codex/press-reader`, based on main `103a77e`.

## Delivered

- Homepage statement fades over 1.1 seconds when it reaches the reading area;
  it no longer reveals at the viewport edge or through the general backstop.
  Reduced motion, disabled scripts and browser Back retain readable text.
- Home and Press show complete client PNG artwork without another publication
  logo, cropping, hover zoom, colour inversion or a preview filling transparent
  areas. Feature, project and year captions remain.
- Each Sanity entry chooses managed article content, an embedded publisher page,
  or a feature preview linking to the original. All open the same BTL panel.
  Close, keyboard navigation and Back restore the page position. Native article
  pages remain available for sharing, new tabs and disabled scripts.
- Publisher frames load only after opening, are sandboxed, and retain a visible
  original-site link. Publishers can block embedding; that cannot be overridden.
  Reader text and magazine pages are authored in Sanity, not fetched from the
  publisher. Existing entries use preview mode until article content is added.
- People has a separate team photograph, uploaded from the supplied HEIC after
  full-resolution JPEG conversion. An editable Sanity crop removes excess
  headroom. Home retains the existing founders photograph.
- Team and Alumni have at most three portrait cards per desktop row and two on
  phones. The redundant “The principals” section was removed as requested.
- Shared image dimensions and rendition ladders describe Sanity's actual crop,
  including pixel rounding. Complete Press artwork ignores stored crop values.
- The editing guide and editor labels reflect these choices.

## Sanity update

The updated editor is deployed at https://btldesigns.sanity.studio/.
Only the team-image field and the two existing Press entries' logo/mode fields
were patched using revision guards. A private local backup was saved first;
unrelated content and drafts were not published. The old logo assets were
retained. Current AD and ELLE artwork are complete PNG uploads in Sanity.

## Validation

- Website build: 19 routes, valid metadata, links, sitemap and security headers;
  existing payload budgets passed. All 275 image renditions warmed.
- Website component/unit checks: 16 passed.
- Studio checks: 8 passed; type check, build and deployment passed.
- Chrome/Safari full run: 85 passed, one intentional clipboard skip, two image
  checks initially failed on a one-pixel crop-rounding discrepancy. After matching
  Sanity's rounding, all eight affected resolution/layout checks passed on rerun.
  The full run covered accessibility, three reader modes, failed/blocked frames,
  focus/history, phones, galleries, enquiries and the visible homepage fade.
- Firefox and hosted performance checks remain for GitHub CI. Local Firefox has
  an existing profile-startup limitation. The previous main release also had an
  intermittent homepage performance-budget failure; budgets were not weakened.

Final article text/magazine pages still need to be added by the studio to use
managed-reader mode on the existing features. The local demonstration is labelled
sample content and exists only in the test build, never in production or Sanity.
