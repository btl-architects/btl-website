import type {Publication} from "./content";
import type {SiteImage} from "./media";

export type OpeningMode = "external" | "reader" | "embed";
export interface TextBlock {
  _type: "block";
  style?: "normal" | "h2" | "h3" | "blockquote";
  listItem?: "bullet" | "number";
  level?: number;
  children: {text: string; marks?: string[]}[];
  markDefs?: {_key: string; _type: string; href?: string}[];
}
export interface PullQuoteBlock {_type: "pullQuote"; text: string; attribution?: string}
export type ArticleBlock = TextBlock | PullQuoteBlock | (SiteImage & {_type: "figure"});

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
    b._type === "block" && b.children?.some(s => s.text?.trim())));
}

export interface ArticleListGroup {list: "bullet" | "number"; items: {block: TextBlock; children: ArticleListGroup[]}[]}
export type ArticleGroup = ArticleListGroup | {list: null; block: ArticleBlock};
/** Group adjacent list items without injecting HTML or depending on client JS. */
export function articleGroups(blocks: ArticleBlock[] = []): ArticleGroup[] {
  const groups: ArticleGroup[] = [];
  const stack: {level: number; group: ArticleListGroup}[] = [];
  for (const block of blocks) {
    if (block._type === "block" && block.listItem) {
      const level = Math.max(1, Math.min(6, block.level ?? 1));
      while (stack.length && stack.at(-1)!.level > level) stack.pop();
      if (stack.at(-1)?.level === level && stack.at(-1)!.group.list !== block.listItem) stack.pop();
      if (!stack.length || stack.at(-1)!.level < level) {
        const group: ArticleListGroup = {list: block.listItem, items: []};
        const parent = stack.at(-1)?.group.items.at(-1);
        if (parent) parent.children.push(group); else groups.push(group);
        stack.push({level, group});
      }
      stack.at(-1)!.group.items.push({block, children: []});
    } else {
      stack.length = 0;
      groups.push({list: null, block});
    }
  }
  return groups;
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
