# Priority Field Deprecation

**Date:** January 2025  
**Status:** Deprecated (retained for backward compatibility)

## Overview

The `priority` field has been removed from the bill reminder workflow. The field still exists in the database schema but is no longer used in the application logic.

## Changes Made

### Frontend
- ✅ Removed priority selector from Add/Edit Bill UI
- ✅ Removed priority badges and icons from bill cards
- ✅ Removed priority props/types from components and hooks
- ✅ Replaced with single "Email Reminder" toggle + days selector

### Backend
- ✅ Updated triggers to not require priority (defaults to 'medium' if needed)
- ✅ Updated edge functions to process reminders without priority
- ✅ Database column retained for backward compatibility

### Tests
- ✅ Updated all tests to remove priority references
- ✅ Added tests for new Email Reminder toggle

## New Reminder Logic

Instead of automatic reminders based on priority, users now explicitly control reminders with:

1. **Email Reminder Toggle:** ON/OFF switch
2. **Days Selector:** Same day, 1 day before, 2 days before, or 7 days before

When enabled, a row is created in `bill_reminders` with:
- `bill_id`
- `user_id`
- `reminder_days_before`
- `status='pending'`
- `delivery_status='pending'`

## Migration Notes

- **No data migration required** - existing priority values in the database are ignored
- **Breaking changes:** None - field still exists in schema
- **Rollback plan:** Field can be re-enabled by reverting frontend changes

## Future Considerations

The `priority` column can be safely dropped in a future migration once we confirm:
1. No external integrations rely on it
2. All historical data analysis is complete
3. Backup/archive needs are satisfied
