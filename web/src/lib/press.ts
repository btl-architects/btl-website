import type {Publication} from "./content";
import type {SiteImage} from "./media";

export type OpeningMode = "external" | "reader" | "embed";
export interface TextBlock {
  _type: "block";
  style?: "normal" | "h2" | "h3" | "blockquote";
  children: {text: string; marks?: string[]}[];
  markDefs?: {_key: string; _type: string; href?: string}[];
}
export type ArticleBlock = TextBlock | (SiteImage & {_type: "figure"});

/** Only web URLs may enter article links or frames. */
export function articleUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {return null;}
}

export function hasArticleContent(blocks?: ArticleBlock[]): boolean {
  return Boolean(blocks?.some(b => b._type === "figure" ? Boolean(b.source || b.static) :
    b.children?.some(s => s.text?.trim())));
}

export function articlePath(item: Publication): string | null {
  if (!item.id) return null;
  if (item.openingMode === "reader" && hasArticleContent(item.readerContent) ||
      item.openingMode === "embed" && articleUrl(item.url)?.startsWith("https://")) {
    // The document ID is stable across title edits, and drafts share the route
    // of their published version. No editorial slug or duplicate URL to maintain.
    return `/press/${encodeURIComponent(item.id.replace(/^drafts\./, ""))}/`;
  }
  return null;
}

/** Keep one destination for the reader, embedded article and feature preview. */
export function articlePagePath(item: Publication): string | null {
  return item.id && (hasArticleContent(item.readerContent) || articleUrl(item.url)) ?
    `/press/${encodeURIComponent(item.id.replace(/^drafts\./, ""))}/` : null;
}
