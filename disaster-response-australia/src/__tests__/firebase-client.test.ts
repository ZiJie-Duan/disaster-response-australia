import { jest } from '@jest/globals';

describe('firebase client bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('initializes firebase app when none exists', async () => {
    const initializeApp = jest.fn(() => ({ app: 'initialized' }));
    const getApps = jest.fn(() => []);
    const getApp = jest.fn();

    jest.doMock('firebase/app', () => ({
      getApps,
      getApp,
      initializeApp,
    }));

    const getAuth = jest.fn(() => ({ auth: true }));
    jest.doMock('firebase/auth', () => ({
      getAuth,
    }));

    const getAnalytics = jest.fn(() => ({ analytics: true }));
    jest.doMock('firebase/analytics', () => ({ getAnalytics }), { virtual: true });

    await jest.isolateModulesAsync(async () => {
      const module = await import('@/app/firebase/client');
      expect(getApps).toHaveBeenCalled();
      expect(initializeApp).toHaveBeenCalled();
      expect(module.app).toEqual({ app: 'initialized' });
      expect(getAuth).toHaveBeenCalledWith({ app: 'initialized' });

      await Promise.resolve();
      expect(module.analytics).toEqual({ analytics: true });
    });
  });

  it('reuses existing firebase app', async () => {
    const existingApp = { app: 'existing' };
    const initializeApp = jest.fn();
    const getApps = jest.fn(() => [existingApp]);
    const getApp = jest.fn(() => existingApp);

    jest.doMock('firebase/app', () => ({
      getApps,
      getApp,
      initializeApp,
    }));

    const getAuth = jest.fn(() => ({ auth: 'existing' }));
    jest.doMock('firebase/auth', () => ({
      getAuth,
    }));

    jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({ analytics: 'existing' })) }), { virtual: true });

    await jest.isolateModulesAsync(async () => {
      const module = await import('@/app/firebase/client');
      expect(getApps).toHaveBeenCalled();
      expect(initializeApp).not.toHaveBeenCalled();
      expect(getApp).toHaveBeenCalled();
      expect(module.app).toBe(existingApp);
      expect(getAuth).toHaveBeenCalledWith(existingApp);
    });
  });
});
