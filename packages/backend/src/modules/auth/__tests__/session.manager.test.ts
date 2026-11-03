import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';
import { SessionManager } from '../session.manager';

describe('SessionManager', () => {
  let cache: MockProxy<CacheService>;
  let config: MockProxy<ConfigurationService>;
  let sessionManager: SessionManager;

  beforeEach(() => {
    cache = mock<CacheService>();
    config = mock<ConfigurationService>();
    config.get.calledWith('userSettings').mockReturnValue(fromPartial({ sessionMaxAgeInDays: 7 }));
    sessionManager = new SessionManager(cache, config);
  });

  it('creates a session using the configured lifetime', async () => {
    const sessionId = await sessionManager.createSession(1);

    expect(cache.set).toHaveBeenCalledWith(`session:${sessionId}`, '1', 604_800);
    expect(cache.set).toHaveBeenCalledWith(`session:1:${sessionId}`, `session:${sessionId}`, 604_800);
  });

  it('extends an existing session by the configured lifetime', () => {
    cache.get.mockReturnValue('1');

    sessionManager.refreshSession('session-id');

    expect(cache.set).toHaveBeenCalledWith('session:session-id', '1', 604_800);
    expect(cache.set).toHaveBeenCalledWith('session:1:session-id', 'session:session-id', 604_800);
  });

  it('does not extend an unknown session', () => {
    cache.get.mockReturnValue(undefined);

    sessionManager.refreshSession('session-id');

    expect(cache.set).not.toHaveBeenCalled();
  });

  it('uses the configured lifetime instead of a hardcoded one', async () => {
    config.get.calledWith('userSettings').mockReturnValue(fromPartial({ sessionMaxAgeInDays: 14 }));

    await sessionManager.createSession(1);

    expect(cache.set).toHaveBeenCalledWith(expect.stringContaining('session:'), '1', 1_209_600);
  });
});
