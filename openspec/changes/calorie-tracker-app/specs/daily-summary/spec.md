## Purpose

The summary answers the question the user opens the app for: how much have I eaten today, and how does it compare to my goal. It aggregates the selected day's log entries into calories and macros and presents progress against the daily calorie target.

## ADDED Requirements

### Requirement: Consumed calories for the selected day

The system SHALL display the total calories consumed on the selected day, equal to the sum over that day's entries of the food's calories per unit multiplied by the entry's quantity.

#### Scenario: Total is the sum of entries

- **GIVEN** a day with one entry of 330 calories and one entry of 105 calories
- **WHEN** the user views the summary for that day
- **THEN** the consumed total shows 435 calories

#### Scenario: Empty day

- **WHEN** the user views the summary for a day with no entries
- **THEN** the consumed total shows 0 calories
- **AND** an empty state indicates nothing has been logged for that day

### Requirement: Macro totals for the selected day

The system SHALL display total protein, carbohydrate, and fat in grams for the selected day, each computed as the sum over the day's entries of the food's per-unit value multiplied by the entry's quantity.

#### Scenario: Macros aggregate across entries

- **GIVEN** a day with two entries contributing 31g and 1g of protein
- **WHEN** the user views the summary for that day
- **THEN** the protein total shows 32g

### Requirement: Progress against the daily goal

The system SHALL display the day's consumed calories against the current daily calorie goal, together with a proportional visual indicator of progress and the remaining calories.

#### Scenario: Under the goal

- **GIVEN** a goal of 2000 calories and 1450 consumed
- **WHEN** the user views the summary
- **THEN** the summary shows 1450 of 2000 calories
- **AND** it shows 550 calories remaining

#### Scenario: Over the goal

- **GIVEN** a goal of 2000 calories and 2300 consumed
- **WHEN** the user views the summary
- **THEN** the summary indicates the goal is exceeded by 300 calories
- **AND** the progress indicator is capped at its full extent rather than overflowing its container

#### Scenario: Exactly at the goal

- **GIVEN** a goal of 2000 calories and 2000 consumed
- **WHEN** the user views the summary
- **THEN** the summary shows 0 calories remaining
- **AND** the day is not reported as exceeded

### Requirement: Summary reflects mutations immediately

The summary SHALL update to reflect an added, edited, or deleted entry, or a changed goal, without the user reloading the page.

#### Scenario: Totals follow an add

- **WHEN** the user adds an entry worth 200 calories
- **THEN** the consumed total increases by 200 without a page reload

#### Scenario: Totals follow a goal change

- **WHEN** the user changes the daily goal
- **THEN** the remaining-calories figure and the progress indicator are recomputed against the new goal without a page reload

### Requirement: Rounding of displayed values

Calories SHALL be displayed as whole numbers and macro grams SHALL be displayed to at most one decimal place. Rounding SHALL apply to display only; stored values SHALL keep full precision so that totals do not drift as entries are added.

#### Scenario: Fractional quantity displays rounded

- **GIVEN** a food with 165 calories per `100g` logged with quantity `0.33`
- **WHEN** the user views the entry and the day total
- **THEN** the calories are shown as a whole number
- **AND** the day total equals the rounded sum of the unrounded entry values, not the sum of rounded values
