## Purpose

The catalog is the set of foods a user can log, each carrying the nutrition facts for one unit of that food. It combines a fixed seeded reference list with foods the user creates, and lets the user find a food quickly by name.

## Requirements

### Requirement: Seeded reference foods

The system SHALL provide a built-in catalog of at least 20 common foods available before the user creates any data. Each food SHALL have a name, a unit, calories per unit, and grams of protein, carbohydrate, and fat per unit.

Seeding SHALL be idempotent: running it repeatedly SHALL NOT create duplicate foods and SHALL NOT alter or remove entries the user has logged.

#### Scenario: Catalog is populated on a fresh install

- **WHEN** the application is started against a freshly seeded database
- **THEN** at least 20 foods are selectable
- **AND** each of them exposes a name, a unit, calories per unit, and protein, carbohydrate, and fat per unit

#### Scenario: Re-seeding does not duplicate

- **WHEN** the seed routine is run a second time on an already-seeded database
- **THEN** the number of seeded foods is unchanged
- **AND** no food appears twice under the same name

### Requirement: Food units

Each food SHALL declare exactly one unit that its nutrition values are stated per. The unit SHALL be either a weight basis (`100g`) or a discrete serving (for example `piece`, `slice`, `cup`, `tbsp`).

#### Scenario: Weight-based food

- **WHEN** the user views a food whose unit is `100g`
- **THEN** the displayed calories and macros are the amounts contained in 100 grams of that food

#### Scenario: Serving-based food

- **WHEN** the user views a food whose unit is `piece`
- **THEN** the displayed calories and macros are the amounts contained in one piece of that food

### Requirement: Food search

The system SHALL let the user narrow the catalog by typing part of a food's name. Matching SHALL be case-insensitive and SHALL match anywhere in the name, not only at the start.

#### Scenario: Partial case-insensitive match

- **WHEN** the user types `chick` into the food search field
- **THEN** foods whose name contains `chick` in any letter case are shown

#### Scenario: No match

- **WHEN** the user types text that matches no food name
- **THEN** an empty-result message is shown
- **AND** the user is offered the option to create a custom food

### Requirement: User-created custom foods

The system SHALL let the user add a food that is not in the seeded list by supplying a name, a unit, calories per unit, and protein, carbohydrate, and fat per unit. A saved custom food SHALL be selectable for logging exactly like a seeded food, and SHALL persist across restarts.

Custom foods SHALL be distinguishable from seeded foods in the interface.

#### Scenario: Creating a custom food

- **WHEN** the user submits a new food with a name not already in the catalog and valid nutrition values
- **THEN** the food is saved
- **AND** it appears in search results
- **AND** it is marked as custom

#### Scenario: Duplicate name rejected

- **WHEN** the user submits a custom food whose name matches an existing food, ignoring case and surrounding whitespace
- **THEN** the food is not saved
- **AND** an error explains that the name is already taken

### Requirement: Custom food validation

The system SHALL reject a custom food whose name is empty or whose calories or macro values are negative or non-numeric. Rejection SHALL leave the catalog unchanged and SHALL report which field was invalid.

#### Scenario: Negative calories rejected

- **WHEN** the user submits a custom food with calories per unit of `-5`
- **THEN** the food is not saved
- **AND** an error identifies the calories field as invalid

#### Scenario: Empty name rejected

- **WHEN** the user submits a custom food with a blank name
- **THEN** the food is not saved
- **AND** an error identifies the name field as required

### Requirement: Seeded foods are immutable

The system SHALL NOT offer editing or deletion of seeded foods. Custom foods MAY be created but editing and deletion of foods are out of scope for this change.

#### Scenario: No edit affordance on a seeded food

- **WHEN** the user views a seeded food in the catalog
- **THEN** no control to edit or delete that food is presented
