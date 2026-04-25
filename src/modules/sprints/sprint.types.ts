export type SprintStatus = 'planning' | 'active' | 'closed';

export interface IVelocity {
  planned: number;
  completed: number;
}

export interface ISprint {
  id: string;
  name: string;
  goal?: string;
  project: string;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  velocity: IVelocity;
  retroNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
