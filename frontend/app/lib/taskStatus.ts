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