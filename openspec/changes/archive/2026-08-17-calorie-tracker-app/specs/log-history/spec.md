## Purpose

History lets the user look back at what they ate on earlier days and see how those days compared to their goal, without leaving the single page the rest of the app lives on.

## ADDED Requirements

### Requirement: Selecting a day to view

The system SHALL let the user choose which calendar day to view. Choosing a day SHALL show that day's log entries and that day's summary in place, on the same page, with no navigation to another page or route.

#### Scenario: Switching to a past day

- **WHEN** the user selects a past date on which entries exist
- **THEN** that day's entries are listed
- **AND** the summary shows that day's totals against the goal

#### Scenario: Switching to a day with no entries

- **WHEN** the user selects a date on which nothing was logged
- **THEN** an empty state is shown for that day
- **AND** the summary shows 0 consumed calories

#### Scenario: Staying on one page

- **WHEN** the user changes the selected day
- **THEN** the browser remains on the application's single route
- **AND** no page-to-page navigation occurs

### Requirement: Default selected day

The system SHALL default to the current local calendar day when the user opens the application without specifying a day.

#### Scenario: Opening the app

- **WHEN** the user opens the application with no day specified
- **THEN** today's date is selected
- **AND** today's entries and summary are shown

### Requirement: Selected day survives reload and sharing

The selected day SHALL be reflected in the page's address so that reloading the page, or reopening the same address, restores the same day.

#### Scenario: Reload preserves the day

- **WHEN** the user selects a past day and reloads the page
- **THEN** the same past day is still selected

#### Scenario: Invalid day in the address

- **WHEN** the page is opened with a malformed or unparseable date in the address
- **THEN** the application falls back to today rather than failing to render

### Requirement: Logging into a past day

The system SHALL allow adding, editing, and deleting entries on whichever day is selected, including past days. Mutations SHALL apply to the selected day, not to today.

#### Scenario: Adding to a past day

- **WHEN** a past day is selected and the user adds an entry
- **THEN** the entry is recorded on that past day
- **AND** today's totals are unchanged

### Requirement: Recent-days overview

The system SHALL show a compact overview of the last 7 days ending at the selected day, giving each day's consumed calories relative to the goal. Selecting a day from the overview SHALL make it the selected day.

#### Scenario: Overview covers seven days

- **WHEN** the user views the overview
- **THEN** seven days are represented, including the selected day

#### Scenario: Jumping from the overview

- **WHEN** the user picks a day in the overview
- **THEN** that day becomes the selected day
- **AND** the entry list and summary update to that day

#### Scenario: Days with no entries in the overview

- **WHEN** a day in the seven-day window has no entries
- **THEN** it is represented with zero consumed calories rather than omitted

### Requirement: Future days

The system SHALL NOT offer selection of days after today, since logging food that has not been eaten is not a supported use.

#### Scenario: Future date is not selectable

- **WHEN** the user opens the day picker
- **THEN** dates after today cannot be chosen
