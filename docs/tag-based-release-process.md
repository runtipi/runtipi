````markdown
<!-- filepath: /Users/nicolas/Developer/runtipi/docs/tag-based-release-process.md -->

# Runtipi Tag-Based Release Process

This document describes the technical implementation of the Runtipi tag-based release process, from alpha to beta to final release.

## Overview

Runtipi follows a structured release cycle with three main phases:

1. **Alpha releases**: Early development versions for testing new features
2. **Beta releases**: More stable versions for wider testing before a main release
3. **Main releases**: Production-ready releases

Each phase uses a unified GitHub Actions workflow triggered by tag creation to automate building, testing, and publishing releases.

## Version Numbering

Runtipi uses semantic versioning with the following format:

- Alpha: `vX.Y.Z-alpha.N` (where N is the alpha version number)
- Beta: `vX.Y.Z-beta.N` (where N is the beta version number)
- Release: `vX.Y.Z`

## Tag-Based Release Process

The release process is triggered automatically when a git tag matching the version pattern is pushed to the repository:

### Creating Release Tags

To create a release, you need to create and push a tag with the appropriate format:

```bash
# Create a tag on the current commit
git tag v4.2.0-alpha.1
git push origin v4.2.0-alpha.1

# OR create a tag on a specific commit
git tag v4.2.0-beta.1 <commit-hash>
git push origin v4.2.0-beta.1
```
````

### Unified Release Workflow

The `.github/workflows/unified-release.yml` workflow is triggered by tag creation events and:

1. **Determines the release type** based on the tag pattern
2. **Runs appropriate tests** based on the release type:
   - Beta and main releases: Run integration and unit tests to ensure quality
3. **Builds Docker images**:
   - Tags with the version from the git tag
   - For main releases, also adds the `latest` tag
4. **Builds CLI**:
   - Triggers a workflow in the `runtipi/cli` repository
   - Downloads the built CLI binaries
5. **Creates GitHub release**:
   - Creates a GitHub release with the appropriate prerelease setting
   - Uploads CLI binaries as release assets
6. **Runs E2E tests** on the released version
7. **Promotes main releases** from prerelease to release if all tests pass

## Release Promotion Workflow

The typical flow for releasing a new version is:

1. **Development Phase**:

   - Features are developed on feature branches
   - Pull requests are merged to the main branch

2. **Alpha Phase**:

   - Create an alpha tag to test new features (e.g., `v4.2.0-alpha.1`)
   - Multiple alpha tags may be created to fix issues

3. **Beta Phase**:

   - Create a beta tag once features stabilize (e.g., `v4.2.0-beta.1`)
   - More testing is conducted with a focus on stability
   - Beta releases ensure all tests pass consistently

4. **Release Phase**:
   - Create a main release tag (e.g., `v4.2.0`)
   - The release is thoroughly tested and automatically promoted if tests pass

## Required Permissions

Tag creation requires appropriate permissions:

- Tag protection rules restrict tag creation to trusted maintainers
- Repository permissions prevent unauthorized users from creating release tags

## Best Practices for Tag-Based Releases

1. **Commit Specificity**: Tags can be created on any commit, not just the latest commit on the main branch.

2. **Branch Protection**: Ensure proper branch protection rules are in place for the main branch.

3. **Tag Protection**: Configure tag protection rules to prevent unauthorized tag creation.

4. **Testing Before Tagging**: For beta and main releases, it's recommended to run tests locally before creating a tag.

5. **Release Notes**: Add comprehensive release notes to the GitHub release after it's created.

6. **Monitoring**: Watch for any issues after a release and be prepared to create a patch release if needed.

## Maintainer Guide

For Runtipi maintainers, a detailed step-by-step guide for creating releases is available in the [Maintainer's Guide to Tag-Based Releases](./maintainer-release-guide.md).

## Frequently Asked Questions

### Why did we move to a tag-based release process?

The tag-based release process offers several advantages:

- Allows releases to be created from specific commits, not just the latest main branch
- Reduces manual steps in the release process
- Provides a clear naming convention for different release types
- Enables better tracking of release history
- Simplifies the release workflow by unifying the previously separate alpha, beta, and main release processes

### How are Docker images tagged?

- Alpha releases: `ghcr.io/runtipi/runtipi:vX.Y.Z-alpha.N`
- Beta releases: `ghcr.io/runtipi/runtipi:vX.Y.Z-beta.N`
- Main releases: `ghcr.io/runtipi/runtipi:vX.Y.Z` and `ghcr.io/runtipi/runtipi:latest`

### What happens after a release?

After a successful release, maintainers will:

1. Update release notes with detailed information
2. Bump the version in package.json to prepare for the next development cycle
3. Announce the release on the forums and Discord
4. Monitor for any issues that require a patch release

## Conclusion

The Runtipi tag-based release process provides a streamlined, automated approach for releasing new versions. By automating releases through git tags, the process reduces manual steps while maintaining the same quality standards through comprehensive testing.
```

```
