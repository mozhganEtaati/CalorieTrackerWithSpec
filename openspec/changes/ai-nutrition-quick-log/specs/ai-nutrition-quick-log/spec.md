## Purpose

Lets a user log what they ate for the current day directly from an AI-analyzed text description or photo, without first creating a reusable catalog food, while always requiring an explicit review-and-confirm step before anything is written to the log.

## ADDED Requirements

### Requirement: AI quick-log review step
Submitting a text description or photo to the quick-log lookup SHALL only display the identified item(s) with their estimated nutrition for review; it SHALL NOT create any `Food` or `LogEntry` row until the user explicitly confirms.

#### Scenario: Lookup succeeds and shows a review list
- **WHEN** a text or image lookup identifies one or more food items
- **THEN** each item is shown with its name and estimated calories, each preselected (checked) for logging, and no `Food` or `LogEntry` row exists yet

#### Scenario: User cancels without confirming
- **WHEN** a review list is shown and the user dismisses it instead of confirming
- **THEN** no `Food` or `LogEntry` row is created and the quick-log input remains as the user left it

### Requirement: Per-item logging on confirm
Confirming the review list SHALL create exactly one `LogEntry` for the current day per checked item, not a single combined entry.

#### Scenario: Confirm with all items checked
- **WHEN** a lookup identifies three items, all remain checked, and the user confirms
- **THEN** three `LogEntry` rows are created for the currently selected day, one per item

#### Scenario: Confirm with some items unchecked
- **WHEN** a user unchecks one of several identified items before confirming
- **THEN** only the checked items become `LogEntry` rows; the unchecked item is not logged

### Requirement: Food reuse on confirm
When a confirmed item's name case-insensitively matches an existing `Food`, the system SHALL log against that existing food rather than creating a duplicate; otherwise it SHALL create a new `Food` from the AI-estimated values.

#### Scenario: Confirmed item matches an existing food by name
- **WHEN** a confirmed item's name matches an existing `Food` row's name, ignoring case
- **THEN** the resulting `LogEntry` references the existing `Food` row and no new `Food` row is created for that item

#### Scenario: Confirmed item has no matching food
- **WHEN** a confirmed item's name does not match any existing `Food` row
- **THEN** a new `Food` row is created from the AI-estimated values before the `LogEntry` referencing it is created

### Requirement: Quick-log input clears after a successful confirm
After all confirmed items are successfully logged, the quick-log description text and any selected photo SHALL be cleared, along with the review list.

#### Scenario: Successful confirm clears the input
- **WHEN** a confirm completes successfully
- **THEN** the description field is empty, no file remains selected, and the review list is no longer shown

#### Scenario: Failed confirm does not clear the input
- **WHEN** confirming fails (e.g. a database error)
- **THEN** the description field, selected photo, and review list are left as they were so the user can retry
