/** Records read from the two traceability indices. Configured need options can vary per project. */
export type NeedItem = {
  id: string;
  type: string;
  title: string;
  content?: string;
  docname?: string;
  lineno?: number;
  status?: string;
  node_id?: string;
  node_properties?: string;
  contract_source?: string;
  code_url?: string[];
  parts?: Record<string,{id:string;content:string}>;
  implements?: string[];
  fulfills?: string[];
  contains?: string[];
  parent_spec?: string[];
  flows_to?: string[];
  calls?: string[];
  verifies?: string[];
  [option: string]: unknown;
};
export type NeedIndex = Record<string,NeedItem>;

export type SourceRef = {path:string;line:number;source?:string;symbol?:string};
export type CodeEntity = {
  path: string;
  symbol: string|null;
  signature?: string|null;
  startLine?: number|null;
  endLine?: number|null;
  kind?: string|null;
  language?: string;
  needIds: string[];
  markerLines: number[];
  declarations?: {needId:string;line:number}[];
  source?: string;
  indexState?: string;
};

export type SourceRevision = Record<string,{size:number;mtimeMs:number}>;
export type IndexStatus = {
  state: string; source: string; path: string|null; builtAt?: string|null; error?: string; message?: string;
  sourceRevision?: SourceRevision|null;
};

export type ObservedTest = {
  id: string; state: string; message?: string; file?: string; symbol?: string;
};
