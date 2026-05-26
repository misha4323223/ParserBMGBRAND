import type { CollabPersonResult } from "./collabPersonResult";

export interface CollabSearchResult {
  results: CollabPersonResult[];
  explanation: string;
  query: string;
}
