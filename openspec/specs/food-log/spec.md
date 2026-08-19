## Purpose

The log records what the user ate: each entry pairs a food from the catalog with a quantity and a calendar day. It is the source of truth from which every calorie and macro total in the app is derived.

## Requirements

### Requirement: Adding a log entry

The system SHALL let the user add an entry by choosing a food from the catalog and entering a quantity. The entry SHALL be recorded against the currently selected calendar day and SHALL persist across restarts.

Quantity SHALL be interpreted as a multiplier of the food's unit: quantity `1.5` of a food measured per `100g` means 150 grams, and quantity `2` of a food measured per `piece` means two pieces.

#### Scenario: Entry added to the selected day

- **WHEN** the user selects a food, enters a quantity greater than zero, and confirms
- **THEN** the entry appears in the list for the selected day
- **AND** the day's totals update to include it
- **AND** the entry is still present after the application is restarted

#### Scenario: Multiple entries of the same food

- **WHEN** the user adds the same food twice on the same day
- **THEN** two separate entries are listed
- **AND** both contribute to the day's totals

### Requirement: Quantity validation

The system SHALL reject an entry whose quantity is zero, negative, or not a number. A rejected entry SHALL NOT be saved and SHALL NOT change any total, and the reason SHALL be shown to the user.

#### Scenario: Zero quantity rejected

- **WHEN** the user submits an entry with quantity `0`
- **THEN** the entry is not saved
- **AND** an error states that the quantity must be greater than zero

#### Scenario: Non-numeric quantity rejected

- **WHEN** the user submits an entry with a quantity that is not a number
- **THEN** the entry is not saved
- **AND** an error states that the quantity must be a number

### Requirement: Per-entry nutrition

Each listed entry SHALL show the food name, the quantity with its unit, and the calories that entry contributes. Contributed calories and macros SHALL equal the food's per-unit values multiplied by the entry's quantity.

#### Scenario: Calories scale with quantity

- **GIVEN** a food with 165 calories per `100g`
- **WHEN** the user logs it with quantity `2`
- **THEN** that entry shows 330 calories

### Requirement: Editing a log entry

The system SHALL let the user change the quantity of an existing entry. Saving the edit SHALL update the entry and every total derived from it. Cancelling SHALL leave the entry unchanged.

Changing which food an entry refers to is not supported; the user achieves that by deleting the entry and adding a new one.

#### Scenario: Quantity edit updates totals

- **WHEN** the user changes an entry's quantity from `1` to `3` and saves
- **THEN** the entry shows the quantity `3` and its recalculated calories
- **AND** the day's totals reflect the new value

#### Scenario: Cancelled edit changes nothing

- **WHEN** the user begins editing an entry, alters the quantity, and cancels
- **THEN** the entry retains its original quantity
- **AND** the day's totals are unchanged

#### Scenario: Invalid edit rejected

- **WHEN** the user saves an edit with a quantity of zero or less
- **THEN** the entry is not modified
- **AND** an error states that the quantity must be greater than zero

### Requirement: Deleting a log entry

The system SHALL let the user delete an entry. A deleted entry SHALL be removed from its day's list and SHALL no longer contribute to any total. Deletion SHALL be permanent; no undo is offered.

#### Scenario: Deleted entry leaves the list and totals

- **WHEN** the user deletes an entry
- **THEN** the entry no longer appears in the day's list
- **AND** the day's totals decrease by that entry's contribution

#### Scenario: Deleting the last entry of a day

- **WHEN** the user deletes the only entry on a day
- **THEN** the day shows an empty-log state
- **AND** the day's consumed calories are zero

### Requirement: Entries belong to a local calendar day

Each entry SHALL be associated with a calendar day in the user's local timezone. An entry SHALL NOT move to an adjacent day because of the time of day at which it was created or read.

#### Scenario: Late-evening entry stays on the same day

- **WHEN** the user adds an entry at 23:30 local time while that day is selected
- **THEN** the entry is listed under that same calendar day
- **AND** it is not listed under the following day

### Requirement: Entry ordering

Entries within a day SHALL be listed in a stable order that does not change between renders when the underlying data has not changed.

#### Scenario: Order is stable across a reload

- **WHEN** the user reloads the page with several entries logged for a day
- **THEN** the entries appear in the same order as before the reload
