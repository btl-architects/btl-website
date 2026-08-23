import { figure, credits, seo } from "./objects";
import project from "./project";
import person from "./person";
import publication from "./publication";
import category from "./category";
import location from "./location";
import settings from "./settings";

export const schemaTypes = [
  // documents
  project, person, publication, category, location, settings,
  // objects
  figure, credits, seo,
];
