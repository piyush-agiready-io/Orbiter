export type LinkedEntityType = 'task' | 'sprint';

export interface LinkedEntity {
  type: LinkedEntityType;
  ref: string;
}

export interface IDoc {
  _id: string;
  title: string;
  content: Record<string, unknown>;
  contentPlaintext: string;
  project: string;
  author: string;
  linkedTo: LinkedEntity[];
  createdAt: Date;
  updatedAt: Date;
}
