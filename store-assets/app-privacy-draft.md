# App Privacy questionnaire draft

This is a preparation worksheet, not a final Apple privacy declaration. Confirm every answer against the deployed services, SDK configuration and the final privacy policy before submission.

## Data categories likely used

| Apple category | Examples in Companio | Purpose | Linked to user? | Tracking? |
| --- | --- | --- | --- | --- |
| Contact info | Email address | Account access and support | Yes | No |
| Name | Adult display name | Profile and chat identity | Yes | No |
| User ID | Account and household IDs | Authentication, matching and access control | Yes | No |
| Location | Approximate area / coarse coordinates | Nearby discovery and event distance | Yes | No |
| User content | Profile text, images, messages, reports, meetup details | Core social features and safety | Yes | No |
| Identifiers | Device push token | Notifications | Yes | No |
| Diagnostics | Error and operational logs without message content | Security and reliability | Usually no | No |

## Important checks before answering Apple

- Confirm whether Supabase, Vercel, email, push and error-monitoring providers receive each category.
- Confirm whether any analytics or advertising SDK has been added since this worksheet was created.
- Confirm retention periods and deletion behavior for messages, reports, media and push tokens.
- Confirm that precise location is not collected or stored. If the implementation changes, update this worksheet.
- Confirm the legal entity and privacy-policy URL.
