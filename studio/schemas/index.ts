import { figure, credits, seo } from "./objects";
import project from "./project";
import person from "./person";
import publication from "./publication";
import category from "./category";
import settings from "./settings";

export const schemaTypes = [
  // documents
  project, person, publication, category, settings,
  // objects
  figure, credits, seo,
];
