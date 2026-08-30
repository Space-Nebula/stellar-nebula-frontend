# Release Process

## Version Bumping

We follow **Semantic Versioning** (SemVer). The semantic-release tool automates this based on commit messages.

## Changelog Automation

Changelogs are automatically generated based on the commits since the last release.

## Staging & Production Deployment

- **Staging**: Merges to `main` automatically deploy to the staging environment.
- **Production**: Releases are tagged and deployed manually after QA sign-off on staging.

## Rollback Procedures

- Revert the bad commit on `main`.
- Trigger a new release to roll forward.
- In absolute emergencies, redeploy the previous healthy version's artifact directly.
