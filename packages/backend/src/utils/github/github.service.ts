import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { Octokit } from 'octokit';
import semver from 'semver';

const octokit = new Octokit({});

type GithubRelease = {
  tag_name: string;
  body: string;
  created_at: string;
  prerelease: boolean;
  draft: boolean;
};

@Injectable()
export class GithubService {
  constructor(
    private readonly cache: CacheService,
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
  ) {}

  async timeout(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getLatestRelease(owner: string, repo: string) {
    const currentVersion = this.config.getConfig().version;

    let version = this.cache.get('latestVersion') ?? '';
    let body = this.cache.get('latestVersionBody') ?? '';

    if (version) {
      return { version, body };
    }

    const versionPromise = new Promise<{ version: string; body: string } | null>((resolve) => {
      octokit.rest.repos
        .getLatestRelease({
          owner,
          repo,
        })
        .then((res) => {
          version = res.data.tag_name;
          body = res.data.body ?? '';

          resolve({
            version: res.data.tag_name,
            body: res.data.body ?? '',
          });
        })
        .catch((err) => {
          this.logger.debug('GitHub API call failed, will use empty cache', err);
          resolve(null);
        });
    });

    const result = await Promise.race([versionPromise, this.timeout(3000).then(() => null)]);
    this.cache.set('latestVersion', result?.version ?? currentVersion, 60 * 60);
    this.cache.set('latestVersionBody', result?.body ?? '', 60 * 60);
    return result ?? { version: undefined, body: undefined };
  }

  async getReleasesSince(owner: string, repo: string, sinceTag: string) {
    try {
      let releases: GithubRelease[] = [];
      const cachedReleases = this.cache.get(`releasesSince:${sinceTag}`) ?? null;

      if (cachedReleases) {
        releases = JSON.parse(cachedReleases) as GithubRelease[];
      } else {
        const releasesPromise = new Promise<GithubRelease[]>((resolve) => {
          octokit.rest.repos
            .listReleases({
              owner,
              repo,
              per_page: 100,
            })
            .then((res) => {
              const fetchedReleases = res.data.map((release) => ({ ...release, body: release.body ?? '' }));
              resolve(fetchedReleases);
            })
            .catch((err) => {
              this.logger.debug('GitHub API call failed, will use empty releases', err);
              resolve([]);
            });
        });

        releases = await Promise.race([releasesPromise, this.timeout(3000).then(() => [])]);
        this.cache.set(`releasesSince:${sinceTag}`, JSON.stringify(releases), 60 * 60);
      }

      const filtered = releases
        .filter((release) => release.tag_name !== sinceTag)
        .filter((release) => !release.prerelease)
        .filter((release) => !release.draft)
        .filter((release) => semver.gte(release.tag_name, sinceTag)) // only include releases with a greater version than sinceTag
        .sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .map((release) => ({
          version: release.tag_name,
          body: release.body ?? '',
        }));

      return filtered;
    } catch (error) {
      this.logger.error('Error fetching releases:', error);
      return [];
    }
  }
}
