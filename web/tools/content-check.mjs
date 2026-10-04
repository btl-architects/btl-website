import {client, mode} from './env.mjs';
import {validateContent} from './content-validation.mjs';
/* Studio rules also run against API/imported content before any HTML is built.
 * Drafts are checked only in authenticated previews; archived URLs stay valid. */
const data = await client.fetch(`{
  "projects": *[_type == "project" && lifecycle in $states]{
    _id, title, lifecycle, description, seo, previousSlugs, "slug": slug.current,
    "category": category[]->{_type,label,"slug":slug.current},
    "location": location->{_type,label,"slug":slug.current},
    "images": images[]{ alt, rights, kind, "hasAsset": asset.asset->_type == "sanity.imageAsset" }
  },
  "people": *[_type == "person"]{
    _id, name, seo, "slug":slug.current, "portrait": portrait{ alt, rights, "hasAsset": asset.asset->_type == "sanity.imageAsset" }
  },
  "publications": *[_type == "publication"]{
    _id, kind, publication, openingMode, url, seo, previousSlugs, "slug":slug.current,
    "image": image{ alt, rights, "hasAsset": asset.asset->_type == "sanity.imageAsset" },
    intro, "articleHero": articleHero{alt, rights, "hasAsset": asset.asset->_type == "sanity.imageAsset"},
    "readerContent": readerContent[]{_type, style, listItem, level, text, children[]{text, marks}, markDefs[]{_type, href}, alt, rights, "hasAsset": asset.asset->_type == "sanity.imageAsset"}
  },
  "categories": *[_type == "category"]{_id,label,"slug":slug.current},
  "locations": *[_type == "location"]{_id,label,"slug":slug.current},
  "settingsCount": count(*[_type == "settings"]),
  "settings": *[_type == "settings"][0]{
    pageSeo,
    "founders": foundersImage{ alt, rights, "hasAsset": asset.asset->_type == "sanity.imageAsset" },
    "teamImage": teamImage{ alt, rights, "hasAsset": asset.asset->_type == "sanity.imageAsset" },
    "studioImage": studioImage{alt, rights, "hasAsset": asset.asset->_type == "sanity.imageAsset"},
    "studioImages": studioImages[]{alt, rights, "hasAsset": asset.asset->_type == "sanity.imageAsset"},
    nav[]{label, href}, social[]{label, url},
    heroClips[]{label, videoMode, "video": video.asset->url, "poster": poster.asset->url,
      "videoMux": videoMux.asset->{status, data{playback_ids[]{id,policy},static_renditions{files[]{status,name,ext}}}}}
  }
}`, { states: mode.preview ? ["draft", "published", "archived"] : ["published", "archived"] });

const {errors, figures} = validateContent(data, {preview: mode.preview});

if (errors.length) {
  console.error(`\n[content] refusing to build — ${errors.length} problem${errors.length > 1 ? "s" : ""}:\n`);
  for (const e of errors) console.error("  · " + e);
  console.error("\nFix these in the Studio, then build again.\n");
  process.exit(1);
}

console.log(`[content] ${figures} figures valid`);
