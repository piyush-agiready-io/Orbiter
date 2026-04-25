export type EpicStatus = 'planning' | 'active' | 'done';

export interface IEpic {
  id: string;
  title: string;
  description?: string;
  project: string;
  owner: string;
  status: EpicStatus;
  startDate?: Date;
  endDate?: Date;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}
