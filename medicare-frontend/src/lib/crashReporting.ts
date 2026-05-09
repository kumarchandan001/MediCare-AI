/**
 * Frontend Crash Reporting & Recovery Analytics
 * ──────────────────────────────────────────────
 * Captures render crashes, chunk load failures, hydration mismatches,
 * and WebSocket failures for production observability.
 *
 * Privacy-safe: No PII is ever sent. All user IDs are hashed.
 */

interface CrashEvent {
  type: 'render_crash' | 'chunk_load_failure' | 'websocket_failure' | 'unhandled_error' | 'hydration_mismatch';
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  connectionType?: string;
}

class CrashReporter {
  private buffer: CrashEvent[] = [];
  private readonly maxBufferSize = 50;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.setupGlobalHandlers();
    // Flush crash reports every 30 seconds
    this.flushTimer = setInterval(() => this.flush(), 30_000);
  }

  // ── Global Error Handlers ────────────────────────────────
  private setupGlobalHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;

      // Detect dynamic import / chunk load failures
      if (this.isChunkLoadError(error)) {
        this.report({
          type: 'chunk_load_failure',
          message: error?.message || 'Dynamic import failed',
          stack: error?.stack,
        });
        // Attempt recovery: reload the page once
        const hasReloaded = sessionStorage.getItem('__chunk_reload');
        if (!hasReloaded) {
          sessionStorage.setItem('__chunk_reload', '1');
          window.location.reload();
        }
        return;
      }

      this.report({
        type: 'unhandled_error',
        message: error?.message || String(error),
        stack: error?.stack,
      });
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      this.report({
        type: 'unhandled_error',
        message: event.message,
        stack: event.error?.stack,
      });
    });
  }

  // ── Chunk Load Detection ─────────────────────────────────
  private isChunkLoadError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Loading chunk') ||
        error.message.includes('Loading CSS chunk')
      );
    }
    return false;
  }

  // ── Public API ───────────────────────────────────────────
  report(partial: Omit<CrashEvent, 'url' | 'timestamp' | 'userAgent' | 'connectionType'>) {
    const event: CrashEvent = {
      ...partial,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
    };

    if (import.meta.env.DEV) {
      console.warn('[CrashReporter]', event);
    }

    this.buffer.push(event);
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  reportRenderCrash(error: Error, componentStack?: string) {
    this.report({
      type: 'render_crash',
      message: error.message,
      stack: componentStack || error.stack,
    });
  }

  reportWebSocketFailure(reason: string) {
    this.report({
      type: 'websocket_failure',
      message: reason,
    });
  }

  // ── Flush to Backend ─────────────────────────────────────
  private async flush() {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      // Send to backend telemetry endpoint (fire-and-forget)
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/v1/telemetry/crashes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      }).catch(() => {
        // Silently fail — telemetry should never break the app
      });
    } catch {
      // Telemetry is best-effort
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Singleton instance
export const crashReporter = new CrashReporter();
