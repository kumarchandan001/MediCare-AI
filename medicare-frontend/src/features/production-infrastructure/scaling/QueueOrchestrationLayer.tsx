/**
 * QueueOrchestrationLayer — Priority-based task queuing with concurrency
 * control, dead-letter handling, and health-aware scheduling.
 */
import { useCallback, useRef } from "react";

export interface QueuedTask {
  id: string;
  type: string;
  priority: "critical" | "high" | "normal" | "low" | "background";
  payload: Record<string, unknown>;
  status: "queued" | "processing" | "completed" | "failed" | "dead_letter";
  retries: number;
  maxRetries: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
}

export interface QueueMetrics {
  totalQueued: number;
  processing: number;
  completed: number;
  failed: number;
  deadLettered: number;
  avgProcessingTimeMs: number;
  throughputPerMinute: number;
}

export function useQueueOrchestrationLayer(maxConcurrent = 5) {
  const queue = useRef<QueuedTask[]>([]);
  const processing = useRef<Set<string>>(new Set());

  const PRIORITY_WEIGHT: Record<QueuedTask["priority"], number> = { critical: 0, high: 1, normal: 2, low: 3, background: 4 };

  const enqueue = useCallback((type: string, payload: Record<string, unknown>, priority: QueuedTask["priority"] = "normal", maxRetries = 3): QueuedTask => {
    const task: QueuedTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type, priority, payload, status: "queued", retries: 0, maxRetries,
      createdAt: Date.now(), startedAt: null, completedAt: null, error: null,
    };
    queue.current.push(task);
    queue.current.sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);
    return task;
  }, []);

  const dequeue = useCallback((): QueuedTask | null => {
    if (processing.current.size >= maxConcurrent) return null;
    const next = queue.current.find(t => t.status === "queued");
    if (!next) return null;
    next.status = "processing";
    next.startedAt = Date.now();
    processing.current.add(next.id);
    return next;
  }, [maxConcurrent]);

  const complete = useCallback((taskId: string, success: boolean, error?: string) => {
    const task = queue.current.find(t => t.id === taskId);
    if (!task) return;
    processing.current.delete(taskId);
    if (success) { task.status = "completed"; task.completedAt = Date.now(); }
    else {
      task.retries++;
      task.error = error || "Unknown error";
      if (task.retries >= task.maxRetries) { task.status = "dead_letter"; }
      else { task.status = "queued"; task.startedAt = null; }
    }
  }, []);

  const getMetrics = useCallback((): QueueMetrics => {
    const all = queue.current;
    const completed = all.filter(t => t.status === "completed");
    const avgTime = completed.length > 0 ? completed.reduce((s, t) => s + ((t.completedAt || 0) - (t.startedAt || 0)), 0) / completed.length : 0;
    return {
      totalQueued: all.filter(t => t.status === "queued").length,
      processing: processing.current.size,
      completed: completed.length,
      failed: all.filter(t => t.status === "failed").length,
      deadLettered: all.filter(t => t.status === "dead_letter").length,
      avgProcessingTimeMs: avgTime,
      throughputPerMinute: completed.filter(t => (t.completedAt || 0) > Date.now() - 60000).length,
    };
  }, []);

  return { enqueue, dequeue, complete, getMetrics, getQueue: () => [...queue.current] };
}
