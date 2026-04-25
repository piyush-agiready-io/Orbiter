export interface IComment {
  id: string;
  content: string;
  author: string;
  taskId?: string;
  bugId?: string;
  mentions: string[];
  createdAt: Date;
  updatedAt: Date;
}
