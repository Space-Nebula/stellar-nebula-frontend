# Contributing to Nebula Nomad

Thank you for your interest in contributing to Nebula Nomad! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

- Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md).
- Provide a clear and descriptive title.
- Include steps to reproduce the issue.
- Describe the expected and actual behavior.

### Suggesting Features

- Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md).
- Describe the goal of the feature.
- Explain why this feature would be useful.

### Pull Requests

1. Fork the repository and create your branch from `main`.
2. Follow the branch naming convention:
   - `feat/feature-name`
   - `fix/bug-name`
   - `docs/documentation-change`
   - `chore/maintenance-task`
3. Ensure your code follows the established style (run `npm run lint`).
4. Update documentation if necessary.
5. Write tests for new features.
6. Submit a Pull Request with a clear description of the changes.

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Running Locally

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## Coding Style

- We use ESLint and Prettier for code formatting.
- TypeScript is required for all new code.
- Follow the project's folder structure for components and hooks.

## Questions?

If you have any questions, feel free to open an issue or reach out to the maintainers.
