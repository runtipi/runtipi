````markdown
<!-- filepath: /Users/nicolas/Developer/runtipi/docs/maintainer-release-guide.md -->

# Maintainer's Guide to Tag-Based Releases

This guide provides step-by-step instructions for Runtipi maintainers on how to create new releases using the tag-based release process.

## Prerequisites

- You must have maintainer or admin access to the Runtipi repository
- You should have Git installed and configured with appropriate signing keys
- You should be familiar with the [Tag-Based Release Process](./tag-based-release-process.md)

## Release Process Overview

1. Ensure the codebase is ready for release
2. Create and push a git tag to trigger the release process
3. Monitor the release workflow
4. Verify the release artifacts
5. Update release notes

## Step-by-Step Instructions

### 1. Ensure the Codebase is Ready

Before creating a release:

- Verify all tests are passing on the main branch
- Check that all necessary pull requests have been merged
- Review any open issues that might block the release
- Ensure the version number in `package.json` is correct

### 2. Create and Push a Git Tag

```bash
# Get the version number from package.json
VERSION=$(npm run version --silent)

# Create a tag (replace X with alpha/beta/release type and N with the number if needed)
git tag vX.Y.Z-alpha.N
# OR
git tag vX.Y.Z-beta.N
# OR
git tag vX.Y.Z

# Push the tag to trigger the release workflow
git push origin vX.Y.Z-alpha.N
```

### 3. Monitor the Release Workflow

After pushing the tag:

1. Go to [GitHub Actions](https://github.com/runtipi/runtipi/actions) and locate the "Unified Release Workflow" triggered by your tag
2. Monitor the workflow's progress
3. If any job fails, address the issues and re-run the workflow or create a new tag with fixes

### 4. Verify the Release Artifacts

Once the workflow completes successfully:

1. Check the GitHub Releases page for the new release
2. Verify that the Docker images were correctly published to the GitHub Container Registry
3. For main releases, confirm that the `latest` tag was properly updated
4. Verify the CLI binaries were attached to the release

### 5. Update Release Notes

Update the GitHub release with detailed release notes:

1. Go to the [GitHub Releases](https://github.com/runtipi/runtipi/releases) page
2. Click "Edit" on your new release
3. Add a detailed description including:
   - Major new features and improvements
   - Notable bug fixes
   - Breaking changes and migration instructions (if any)
   - Contributors to this release
4. Save the updated release notes

### 6. Announce the Release

For main releases:

1. Post an announcement on the [Runtipi Forums](https://forums.runtipi.io/)
2. Share the release on the [Discord](https://discord.gg/Bu9qEPnHsc) server
3. Update website documentation if needed

## Tag Naming Conventions

- Alpha releases: `vX.Y.Z-alpha.N` (e.g., v4.2.0-alpha.1)
- Beta releases: `vX.Y.Z-beta.N` (e.g., v4.2.0-beta.1)
- Main releases: `vX.Y.Z` (e.g., v4.2.0)

## Troubleshooting

### Tag Creation Issues

If you encounter issues creating tags:

- Make sure you have the necessary permissions
- Check that tag protection rules aren't blocking your tag
- Verify that the tag doesn't already exist (`git tag -l "vX.Y.Z*"`)

### Workflow Failures

If the release workflow fails:

1. Check the workflow logs for specific error details
2. Fix the identified issues in the codebase
3. Create a new tag with the fixed version (don't reuse the same tag)

### Docker Image Issues

If Docker image building fails:

- Verify the Docker builder service is functioning
- Check that required secrets are correctly configured
- Ensure the image builds successfully locally
