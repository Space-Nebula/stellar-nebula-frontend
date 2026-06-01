# Release Process

## Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

- **MAJOR** – breaking changes (incompatible API or contract changes)
- **MINOR** – new features, backwards-compatible
- **PATCH** – bug fixes, backwards-compatible

Versions are managed automatically by [semantic-release](https://semantic-release.gitbook.io/) based on [Conventional Commits](https://www.conventionalcommits.org/).

| Commit prefix                                    | Version bump |
| ------------------------------------------------ | ------------ |
| `fix:`                                           | PATCH        |
| `feat:`                                          | MINOR        |
| `feat!:` / `BREAKING CHANGE:`                    | MAJOR        |
| `docs:`, `chore:`, `refactor:`, `test:`, `perf:` | no release   |

## Changelog Automation

The `CHANGELOG.md` is generated automatically on each release by `@semantic-release/changelog`. Do not edit it manually.

To preview what the next release would look like locally:

```bash
npm run release:dry-run
```

## Release Checklist

Before merging to `main`:

- [ ] All CI checks pass (lint, typecheck, build, tests)
- [ ] PR reviewed and approved
- [ ] Commit messages follow Conventional Commits format
- [ ] Environment variables documented in `.env.example` if changed
- [ ] Breaking changes noted with `BREAKING CHANGE:` footer or `!` suffix

After merge to `main`, the release workflow runs automatically and:

1. Determines the next version from commit history
2. Updates `CHANGELOG.md`
3. Bumps `package.json` version
4. Creates a GitHub Release with release notes
5. Pushes a version tag (e.g. `v1.2.3`)

## Rollback Procedures

### Revert a bad release

1. Identify the last good tag: `git tag --sort=-version:refname | head -5`
2. Create a revert commit on `main`:
   ```bash
   git revert <bad-commit-sha> --no-edit
   git push origin main
   ```
   This triggers a new PATCH release automatically.

### Emergency hotfix

1. Branch from the last good tag:
   ```bash
   git checkout -b hotfix/description v<last-good-version>
   ```
2. Apply the fix with a `fix:` commit.
3. Open a PR targeting `main`.
4. After merge, semantic-release publishes the patch.

### Redeploy a previous version

Vercel/Netlify retain deployment history. Roll back via the dashboard to any prior deployment instantly without a new release.
