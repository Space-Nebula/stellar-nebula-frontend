# Accessibility Compliance

## WCAG Compliance Level

We aim for **WCAG 2.1 AA** compliance across all applications.

## Manual Testing Procedures

- Use **NVDA** on Windows, **VoiceOver** on macOS/iOS, and **TalkBack** on Android.
- Ensure all interactive elements are reachable via keyboard alone (Tab, Enter, Space).
- Test color contrast using automated tools (min 4.5:1 ratio).

## Remediation Workflow

1. Identify the issue via automated or manual testing.
2. Log an issue with the `a11y` tag.
3. Fix the issue prioritizing critical blockers first.
4. Re-test manually to ensure the fix is successful and no regressions occurred.
