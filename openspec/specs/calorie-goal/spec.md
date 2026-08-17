## Purpose

The daily calorie goal is the single number the user measures their day against. It is a personal setting for the one user of this installation, editable at any time and remembered between sessions without any account or sign-in.

## Requirements

### Requirement: A single persisted daily calorie goal

The system SHALL maintain exactly one daily calorie goal for the installation. The goal SHALL persist across restarts and SHALL apply to every day the user views.

#### Scenario: Goal survives a restart

- **WHEN** the user sets the goal and later restarts the application
- **THEN** the previously set goal is still in effect

#### Scenario: Goal applies to past days

- **WHEN** the user views a past day after changing the goal
- **THEN** that day's progress is measured against the current goal

### Requirement: Default goal

The system SHALL provide a default daily calorie goal of 2000 when the user has never set one, so the summary is meaningful on first run.

#### Scenario: First run

- **WHEN** the user opens the application for the first time and has not set a goal
- **THEN** the goal shown is 2000 calories

### Requirement: Editing the goal

The system SHALL let the user change the daily calorie goal from the same page as the log, without navigating elsewhere. A saved goal SHALL take effect immediately in the summary.

#### Scenario: Change takes effect immediately

- **WHEN** the user changes the goal from 2000 to 1800 and saves
- **THEN** the summary compares the day's consumed calories against 1800 without a page reload

### Requirement: Goal validation

The system SHALL accept only a positive whole number as the daily calorie goal. A rejected value SHALL leave the stored goal unchanged and SHALL report the reason.

#### Scenario: Zero rejected

- **WHEN** the user submits a goal of `0`
- **THEN** the goal is not changed
- **AND** an error states that the goal must be greater than zero

#### Scenario: Negative rejected

- **WHEN** the user submits a negative goal
- **THEN** the goal is not changed
- **AND** an error states that the goal must be greater than zero

#### Scenario: Non-numeric rejected

- **WHEN** the user submits a goal that is not a number
- **THEN** the goal is not changed
- **AND** an error states that the goal must be a number

### Requirement: No authentication for the goal

The system SHALL expose the goal without any sign-in, account, or user selection. There SHALL be at most one goal record and no concept of goal ownership.

#### Scenario: Goal reachable without sign-in

- **WHEN** the user opens the application
- **THEN** the goal is readable and editable immediately
- **AND** no login or account prompt is presented
