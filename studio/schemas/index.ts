import { figure, credits, seo } from "./objects";
import project from "./project";
import person from "./person";
import publication from "./publication";
import category from "./category";
import location from "./location";
import heroClip from "./heroClip";
import redirect from "./redirect";
import settings from "./settings";

export const schemaTypes = [
  // documents
  project, person, publication, category, location, settings, redirect,
  // objects
  figure, credits, seo, heroClip,
];
