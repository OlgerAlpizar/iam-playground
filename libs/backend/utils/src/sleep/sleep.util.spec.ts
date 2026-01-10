import { sleep } from './sleep.util';

describe('sleep', () => {
  describe('Unit Tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should resolve after the specified milliseconds', async () => {
      const promise = sleep(1000);

      jest.advanceTimersByTime(1000);

      await expect(promise).resolves.toBeUndefined();
    });

    it('should work with different delay values', async () => {
      const promise1 = sleep(500);
      const promise2 = sleep(2000);

      jest.advanceTimersByTime(500);
      await expect(promise1).resolves.toBeUndefined();

      jest.advanceTimersByTime(1500);
      await expect(promise2).resolves.toBeUndefined();
    });

    it('should handle zero delay', async () => {
      const promise = sleep(0);

      jest.advanceTimersByTime(0);

      await expect(promise).resolves.toBeUndefined();
    });
  });
});
