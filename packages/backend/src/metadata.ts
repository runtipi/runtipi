/* eslint-disable */
export default async () => {
  const t = {
    ['./app.dto']: await import('./app.dto'),
    ['./modules/auth/dto/auth.dto']: await import('./modules/auth/dto/auth.dto'),
    ['./modules/marketplace/dto/marketplace.dto']: await import('./modules/marketplace/dto/marketplace.dto'),
    ['./modules/apps/dto/app.dto']: await import('./modules/apps/dto/app.dto'),
    ['./modules/backups/dto/backups.dto']: await import('./modules/backups/dto/backups.dto'),
    ['./modules/links/dto/links.dto']: await import('./modules/links/dto/links.dto'),
    ['./modules/system/dto/system.dto']: await import('./modules/system/dto/system.dto'),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [import('./modules/user/dto/user.dto'), { UserDto: {} }],
        [
          import('./modules/marketplace/dto/marketplace.dto'),
          {
            AppInfoSimpleDto: {},
            AppInfoDto: {},
            MetadataDto: {},
            SearchAppsQueryDto: {},
            SearchAppsDto: {},
            AppDetailsDto: {},
            PullDto: {},
            AllAppStoresDto: {},
            UpdateAppStoreBodyDto: {},
            CreateAppStoreBodyDto: {},
          },
        ],
        [import('./app.dto'), { UserSettingsDto: {}, PartialUserSettingsDto: {}, AppContextDto: {}, UserContextDto: {}, AcknowledgeWelcomeBody: {} }],
        [import('./modules/queue/queue.entity'), { Queue: {} }],
        [
          import('./modules/auth/dto/auth.dto'),
          {
            LoginBody: {},
            VerifyTotpBody: {},
            LoginDto: {},
            RegisterBody: {},
            RegisterDto: {},
            ChangeUsernameBody: {},
            ChangePasswordBody: {},
            GetTotpUriBody: {},
            GetTotpUriDto: {},
            SetupTotpBody: {},
            DisableTotpBody: {},
            ResetPasswordBody: {},
            ResetPasswordDto: {},
            CheckResetPasswordRequestDto: {},
          },
        ],
        [import('./modules/app-lifecycle/dto/app-lifecycle.dto'), { AppFormBody: {}, UninstallAppBody: {}, UpdateAppBody: {} }],
        [import('./modules/apps/dto/app.dto'), { AppDto: {}, MyAppsDto: {}, GuestAppsDto: {}, GetAppDto: {} }],
        [import('./core/sse/dto/sse.dto'), { StreamAppLogsQueryDto: {}, StreamRuntipiLogsQueryDto: {} }],
        [
          import('./modules/backups/dto/backups.dto'),
          { BackupDto: {}, RestoreAppBackupDto: {}, GetAppBackupsDto: {}, GetAppBackupsQueryDto: {}, DeleteAppBackupBodyDto: {} },
        ],
        [import('./modules/links/dto/links.dto'), { LinkBodyDto: {}, EditLinkBodyDto: {}, LinksDto: {} }],
        [import('./modules/system/dto/system.dto'), { LoadDto: {} }],
      ],
      controllers: [
        [
          import('./app.controller'),
          {
            AppController: {
              userContext: { type: t['./app.dto'].UserContextDto },
              appContext: { type: t['./app.dto'].AppContextDto },
              updateUserSettings: {},
              acknowledgeWelcome: {},
            },
          },
        ],
        [
          import('./modules/auth/auth.controller'),
          {
            AuthController: {
              login: { type: t['./modules/auth/dto/auth.dto'].LoginDto },
              verifyTotp: { type: t['./modules/auth/dto/auth.dto'].LoginDto },
              register: { type: t['./modules/auth/dto/auth.dto'].RegisterDto },
              logout: {},
              changeUsername: {},
              changePassword: {},
              getTotpUri: { type: t['./modules/auth/dto/auth.dto'].GetTotpUriDto },
              setupTotp: {},
              disableTotp: {},
              resetPassword: { type: t['./modules/auth/dto/auth.dto'].ResetPasswordDto },
              cancelResetPassword: {},
              checkResetPasswordRequest: { type: t['./modules/auth/dto/auth.dto'].CheckResetPasswordRequestDto },
              traefik: { type: Object },
            },
          },
        ],
        [import('./modules/i18n/i18n.controller'), { I18nController: { getTranslation: { type: Object } } }],
        [import('./core/health/health.controller'), { HealthController: { check: { type: Object } } }],
        [
          import('./modules/marketplace/marketplace.controller'),
          {
            MarketplaceController: {
              searchApps: { type: t['./modules/marketplace/dto/marketplace.dto'].SearchAppsDto },
              getImage: {},
              pullAppStore: { type: t['./modules/marketplace/dto/marketplace.dto'].PullDto },
              createAppStore: {},
              getAllAppStores: { type: t['./modules/marketplace/dto/marketplace.dto'].AllAppStoresDto },
              getEnabledAppStores: { type: t['./modules/marketplace/dto/marketplace.dto'].AllAppStoresDto },
              updateAppStore: {},
              deleteAppStore: {},
            },
          },
        ],
        [
          import('./modules/apps/apps.controller'),
          {
            AppsController: {
              getInstalledApps: { type: t['./modules/apps/dto/app.dto'].MyAppsDto },
              getGuestApps: { type: t['./modules/apps/dto/app.dto'].GuestAppsDto },
              getApp: { type: t['./modules/apps/dto/app.dto'].GetAppDto },
            },
          },
        ],
        [
          import('./core/sse/sse.controller'),
          { SSEController: { appEvents: { type: Object }, appLogsEvents: { type: Object }, runtipiLogsEvents: { type: Object } } },
        ],
        [
          import('./modules/backups/backups.controller'),
          {
            BackupsController: {
              backupApp: {},
              restoreAppBackup: {},
              getAppBackups: { type: t['./modules/backups/dto/backups.dto'].GetAppBackupsDto },
              deleteAppBackup: {},
            },
          },
        ],
        [
          import('./modules/app-lifecycle/app-lifecycle.controller'),
          {
            AppLifecycleController: {
              installApp: {},
              startApp: {},
              stopApp: {},
              restartApp: {},
              uninstallApp: {},
              resetApp: {},
              updateApp: {},
              updateAppConfig: {},
              updateAllApps: {},
            },
          },
        ],
        [
          import('./modules/links/links.controller'),
          { LinksController: { getLinks: { type: t['./modules/links/dto/links.dto'].LinksDto }, createLink: {}, editLink: {}, deleteLink: {} } },
        ],
        [
          import('./modules/system/system.controller'),
          { SystemController: { systemLoad: { type: t['./modules/system/dto/system.dto'].LoadDto }, downloadLocalCertificate: {} } },
        ],
      ],
    },
  };
};
