## Purpose

Lets a user prefill the custom-food form's nutrition fields from an AI estimate — typed meal description or uploaded photo — instead of typing calories and macros by hand, while always leaving those fields editable and requiring an explicit save before anything is persisted.

## ADDED Requirements

### Requirement: Text-description AI prefill
The custom-food form SHALL offer a text input that, on submission, sends the entered description to the text nutrition lookup endpoint and uses a successful response to prefill the form's nutrition fields.

#### Scenario: Successful text lookup with one identified item
- **WHEN** a user enters a description matching exactly one food item and triggers the lookup
- **THEN** the form's `caloriesPerUnit`, `protein`, `carbs`, and `fat` fields are prefilled with that item's values, the `name` field is prefilled if it was empty, and all fields remain editable

#### Scenario: Successful text lookup with multiple identified items
- **WHEN** the lookup response identifies more than one food item
- **THEN** the user is shown the list of identified items and must pick one before any field is prefilled

#### Scenario: Text lookup fails
- **WHEN** the text lookup endpoint returns a non-2xx response or an `ok: false` result
- **THEN** the form displays an inline error message and no nutrition field is changed

### Requirement: Image AI prefill
The custom-food form SHALL offer a photo upload control that, once a file is selected, sends it to the image nutrition lookup endpoint and uses a successful response to prefill the form's nutrition fields.

#### Scenario: Successful image lookup with one identified item
- **WHEN** a user uploads a photo and the lookup identifies exactly one food item
- **THEN** the form's `caloriesPerUnit`, `protein`, `carbs`, and `fat` fields are prefilled with that item's values, the `name` field is prefilled if it was empty, and all fields remain editable

#### Scenario: Successful image lookup with multiple identified items
- **WHEN** the lookup response identifies more than one food item
- **THEN** the user is shown the list of identified items and must pick one before any field is prefilled

#### Scenario: Image lookup finds no food
- **WHEN** the image lookup endpoint responds with `ok: false` and a "no food recognized" error (HTTP 200)
- **THEN** the form displays that message distinctly from a network/server failure, and no nutrition field is changed

#### Scenario: Image lookup fails
- **WHEN** the image lookup endpoint returns a non-2xx response or another `ok: false` result
- **THEN** the form displays an inline error message and no nutrition field is changed

### Requirement: AI lookup is a review step, not an auto-save
Prefilling nutrition fields from an AI lookup SHALL NOT submit or save the custom food; the user must still trigger the form's existing save action, and may edit any prefilled value first.

#### Scenario: User edits a prefilled value before saving
- **WHEN** an AI lookup prefills `caloriesPerUnit` and the user changes that value before clicking save
- **THEN** the food is created with the user's edited value, not the AI-estimated one

#### Scenario: User discards an AI lookup without saving
- **WHEN** an AI lookup prefills the form and the user cancels the form instead of saving
- **THEN** no `Food` row is created

### Requirement: Loading state during AI lookup
The custom-food form SHALL show a distinct pending state while a text or image lookup request is in flight, during which a new lookup of the same type cannot be triggered.

#### Scenario: Lookup in progress
- **WHEN** a text or image lookup request has been sent and no response has been received yet
- **THEN** the triggering control shows a pending state and is disabled until the request resolves
