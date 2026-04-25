export type LinkType =
  | 'production'
  | 'staging'
  | 'figma'
  | 'api_docs'
  | 'repository'
  | 'other';

export interface ILink {
  _id: string;
  label: string;
  url: string;
  type: LinkType;
  project: string;
  createdAt: Date;
  updatedAt: Date;
}
