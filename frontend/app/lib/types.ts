export enum TaskStatus {
  Pending = 0,
  Drafted = 1,
  Finalized = 2,
  Running = 3,
  Completed = 4,
  Failed = 5
}

export function getTaskStatusLabel(status: number) {
  switch (status) {
    case TaskStatus.Pending: return "Pending";
    case TaskStatus.Drafted: return "Drafted";
    case TaskStatus.Finalized: return "Finalized";
    case TaskStatus.Running: return "Running";
    case TaskStatus.Completed: return "Completed";
    case TaskStatus.Failed: return "Failed";
    default: return "Unknown";
  }
}

export type TaskModel = {
  id: string
  userId: string
  title: string
  inputData: string
  status: number
  result?: string
  createdAt: string
  updatedAt?: string
}

export type PlanModel = {
  id: string
  userId: string
  taskId: string
  graph: string
}

export type TaskUpdate = {
  task_id: string
  user_id: string
  status: number
  description?: string
}