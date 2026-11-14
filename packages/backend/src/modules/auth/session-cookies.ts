import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/common/constants';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import psl from 'psl';
import validator from 'validator';
import { SessionManager } from './session.manager';

@Injectable()
export class SessionCookies {
  private warnedAboutInsecureCookie = false;

  constructor(
    private config: ConfigurationService,
    private sessions: SessionManager,
    private logger: LoggerService,
  ) {}

  private getLegacyDomain(req: Request) {
    const hostHeader = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host;
    const host = hostHeader?.split(',')[0]?.trim().split(':')[0]?.toLowerCase();
    if (!host || !validator.isFQDN(host)) {
      return;
    }

    const parsed = psl.parse(host);
    if (!parsed.error) {
      return `.${parsed.input}`;
    }
  }

  public setSession(res: Response, sessionId: string, req: Request) {
    const maxAge = this.sessions.getSessionMaxAgeInSeconds() * 1000;

    if (this.config.get('userSettings').experimental.insecureCookie) {
      if (!this.warnedAboutInsecureCookie) {
        this.logger.warn('WARNING: Using insecure cookies. This is not recommended for production environments.');
        this.warnedAboutInsecureCookie = true;
      }

      res.cookie(SESSION_COOKIE_NAME, sessionId, { httpOnly: true, secure: false, sameSite: false, maxAge });
      return;
    }

    const legacyDomain = this.getLegacyDomain(req);
    if (legacyDomain) {
      res.clearCookie(SESSION_COOKIE_NAME, { domain: legacyDomain });
    }

    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'lax',
      maxAge,
    });
  }

  public setForwardAuth(res: Response, sessionId: string, req: Request) {
    res.cookie(FORWARD_AUTH_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'lax',
      maxAge: this.sessions.getSessionMaxAgeInSeconds() * 1000,
    });
  }

  public clear(res: Response, req: Request) {
    res.clearCookie(SESSION_COOKIE_NAME);
    res.clearCookie(FORWARD_AUTH_COOKIE_NAME);

    const legacyDomain = this.getLegacyDomain(req);
    if (legacyDomain) {
      res.clearCookie(SESSION_COOKIE_NAME, { domain: legacyDomain });
      res.clearCookie(FORWARD_AUTH_COOKIE_NAME, { domain: legacyDomain });
    }
  }
}
