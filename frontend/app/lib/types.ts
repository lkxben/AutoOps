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
  prompt: string
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

export type RunModel = {
  id: string
  userId: string
  taskId: string
  planId: string
  status: number
  result?: string
  createdAt: string
  updatedAt?: string
}

export enum RunStatus {
  Pending = 0,
  Running = 1,
  Completed = 2,
  Failed = 3
}

export type RunUpdate = {
  runId: string
  userId: string
  taskId: string
  status: number
  description?: string
}

export enum ScheduleStatus {
  Active = 0,
  Paused = 1,
}

export type ScheduleModel = {
  id: string,
  taskId: string,
  status: ScheduleStatus,
  cronEx: string,
  timezone: string,
  nextRunAt: string
}