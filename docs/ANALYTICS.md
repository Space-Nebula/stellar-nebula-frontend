# Analytics Implementation Guide

## Event Taxonomy

- **User Acquisition**: Events related to how users discover and install the app.
- **Engagement**: Events reflecting daily interactions.
- **Monetization**: Events concerning purchases or subscription activities.

## Naming Conventions

- All events must be in `snake_case`.
- Use the format `object_action`, e.g., `button_click`, `page_view`.

## PII Handling

- NEVER send Personally Identifiable Information (PII) such as email, phone numbers, or plain text passwords.
- Only send obfuscated IDs.

## Dashboard Configuration

- Create funnels for each core user journey.
- Set up conversion tracking and retention cohorts.
