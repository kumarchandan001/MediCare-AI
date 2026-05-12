/**
 * AsyncHealthTaskManager — Manages long-running asynchronous health
 * intelligence tasks (predictions, longitudinal analysis, report generation)
 * with progress tracking, cancellation, and result caching.
 */
import { useCallback, useRef } from "react";

export interface AsyncHealthTask {
  id: string;
  type: "prediction" | "longitudinal_analysis" | "report_generation" | "wearable_sync" | "benchmark" | "backup";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  result: unknown | null;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  cancelRequested: boolean;
  metadata: Record<string, unknown>;
}

export interface TaskSchedule {
  taskType: AsyncHealthTask["type"];
  intervalMs: number;
  lastRun: number | null;
  enabled: boolean;
}

export function useAsyncHealthTaskManager() {
  const tasks = useRef<Map<string, AsyncHealthTask>>(new Map());
  const schedules = useRef<TaskSchedule[]>([]);

  const createTask = useCallback((type: AsyncHealthTask["type"], metadata: Record<string, unknown> = {}): AsyncHealthTask => {
    const task: AsyncHealthTask = {
      id: `async-${type}-${Date.now()}`, type, status: "pending", progress: 0,
      result: null, error: null, createdAt: Date.now(), startedAt: null,
      completedAt: null, cancelRequested: false, metadata,
    };
    tasks.current.set(task.id, task);
    return task;
  }, []);

  const updateProgress = useCallback((taskId: string, progress: number, partialResult?: unknown): AsyncHealthTask | null => {
    const task = tasks.current.get(taskId);
    if (!task || task.status !== "running") return null;
    const updated = { ...task, progress: Math.min(100, Math.max(0, progress)), result: partialResult ?? task.result };
    tasks.current.set(taskId, updated);
    return updated;
  }, []);

  const startTask = useCallback((taskId: string): AsyncHealthTask | null => {
    const task = tasks.current.get(taskId);
    if (!task || task.status !== "pending") return null;
    const updated = { ...task, status: "running" as const, startedAt: Date.now() };
    tasks.current.set(taskId, updated);
    return updated;
  }, []);

  const completeTask = useCallback((taskId: string, result: unknown): AsyncHealthTask | null => {
    const task = tasks.current.get(taskId);
    if (!task) return null;
    const updated = { ...task, status: "completed" as const, progress: 100, result, completedAt: Date.now() };
    tasks.current.set(taskId, updated);
    return updated;
  }, []);

  const failTask = useCallback((taskId: string, error: string): AsyncHealthTask | null => {
    const task = tasks.current.get(taskId);
    if (!task) return null;
    const updated = { ...task, status: "failed" as const, error, completedAt: Date.now() };
    tasks.current.set(taskId, updated);
    return updated;
  }, []);

  const cancelTask = useCallback((taskId: string): boolean => {
    const task = tasks.current.get(taskId);
    if (!task || task.status === "completed" || task.status === "failed") return false;
    tasks.current.set(taskId, { ...task, cancelRequested: true, status: "cancelled", completedAt: Date.now() });
    return true;
  }, []);

  const getActiveTasks = useCallback((): AsyncHealthTask[] => {
    return Array.from(tasks.current.values()).filter(t => t.status === "pending" || t.status === "running");
  }, []);

  const getDueSchedules = useCallback((): TaskSchedule[] => {
    const now = Date.now();
    return schedules.current.filter(s => s.enabled && (!s.lastRun || now - s.lastRun >= s.intervalMs));
  }, []);

  return { createTask, startTask, updateProgress, completeTask, failTask, cancelTask, getActiveTasks, getDueSchedules };
}
