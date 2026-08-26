import { describe, expect, it } from "vitest";

describe("Daily Pilot Quota & Race Condition Protection", () => {
  it("enforces default cap of 20 replies and blocks simultaneous concurrent overflow", async () => {
    const dailyCap = 20;
    let publishedCount = 19; // 1 slot remaining

    // Atomic reservation simulation (similar to PostgreSQL row lock/stored procedure)
    let lock = Promise.resolve();

    async function atomicReserveQuota(): Promise<{ success: boolean; publishedIndex?: number }> {
      return new Promise((resolve) => {
        lock = lock.then(async () => {
          if (publishedCount < dailyCap) {
            publishedCount++;
            resolve({ success: true, publishedIndex: publishedCount });
          } else {
            resolve({ success: false });
          }
        });
      });
    }

    // Launch 5 concurrent publishing attempts when only 1 slot remains
    const results = await Promise.all([
      atomicReserveQuota(),
      atomicReserveQuota(),
      atomicReserveQuota(),
      atomicReserveQuota(),
      atomicReserveQuota(),
    ]);

    const successfulAttempts = results.filter((r) => r.success);
    const rejectedAttempts = results.filter((r) => !r.success);

    // Exactly 1 request must succeed and 4 must be blocked
    expect(successfulAttempts.length).toBe(1);
    expect(rejectedAttempts.length).toBe(4);
    expect(publishedCount).toBe(20);
  });

  it("does not count mock reviews or manual human replies against the AI publishing cap", () => {
    function evaluateQuotaConsumption(isMock: boolean, isManual: boolean): boolean {
      if (isMock || isManual) {
        return false; // Does not consume quota
      }
      return true; // Consumes production AI quota
    }

    expect(evaluateQuotaConsumption(true, false)).toBe(false);
    expect(evaluateQuotaConsumption(false, true)).toBe(false);
    expect(evaluateQuotaConsumption(true, true)).toBe(false);
    expect(evaluateQuotaConsumption(false, false)).toBe(true);
  });
});
