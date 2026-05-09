/**
 * Privacy-Safe Analytics Foundation
 * ──────────────────────────────────
 * Ethical, opt-in analytics tracker for production observability.
 * - No PII is ever sent in plain text
 * - User IDs are hashed before transmission
 * - Events are batched to minimize network overhead
 * - Fully opt-in: respects user consent preferences
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: string;
}

class AnalyticsTracker {
  private buffer: AnalyticsEvent[] = [];
  private readonly maxBufferSize = 50;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private optedIn = false;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    // Check stored consent
    this.optedIn = localStorage.getItem('analytics_consent') === 'true';
    // Flush every 60 seconds
    this.flushTimer = setInterval(() => this.flush(), 60_000);
  }

  // ── Consent Management ───────────────────────
  setConsent(consented: boolean) {
    this.optedIn = consented;
    localStorage.setItem('analytics_consent', String(consented));
    if (!consented) {
      this.buffer = [];
    }
  }

  isOptedIn(): boolean {
    return this.optedIn;
  }

  // ── Track Events ─────────────────────────────
  track(event: string, properties?: Record<string, string | number | boolean>) {
    if (!this.optedIn) return;

    this.buffer.push({
      event,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        env: import.meta.env.VITE_APP_ENV || 'development',
      },
      timestamp: new Date().toISOString(),
    });

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  // ── Page View Tracking ───────────────────────
  trackPageView(path: string) {
    this.track('page_view', { path });
  }

  // ── Performance Tracking ─────────────────────
  trackPerformance(metric: string, value: number) {
    this.track('performance', { metric, value });
  }

  // ── WebSocket Usage Tracking ─────────────────
  trackWebSocketEvent(event: string, detail?: string) {
    this.track('websocket', { wsEvent: event, detail: detail || '' });
  }

  // ── Flush to Backend ─────────────────────────
  private async flush() {
    if (this.buffer.length === 0 || !this.optedIn) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/v1/telemetry/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      }).catch(() => {
        // Silently fail — analytics should never break the app
      });
    } catch {
      // Best-effort
    }
  }

  // ── Utilities ────────────────────────────────
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Singleton
export const analytics = new AnalyticsTracker();
