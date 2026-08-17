## Purpose

Provides backend HTTP endpoints that use an AI model to estimate structured nutrition data (calories and macros) from a free-text meal description or an uploaded meal photo, so a future UI can offer AI-assisted food lookup instead of requiring an exact catalog match.

## ADDED Requirements

### Requirement: Text-based nutrition lookup
The system SHALL expose a POST endpoint that accepts a free-text description of a meal and returns structured nutrition data estimated by the AI model for the food item(s) identified in the text.

#### Scenario: Valid meal description returns nutrition data
- **WHEN** a client POSTs a non-empty text description (e.g. "grilled chicken with rice and salad") to the text lookup endpoint
- **THEN** the response is `200` with a JSON body containing `ok: true` and a `data` object listing one or more identified food items, each with estimated calories, protein, carbs, and fat, plus a total across all items

#### Scenario: Empty or missing description is rejected
- **WHEN** a client POSTs a request with an empty, whitespace-only, or missing description field
- **THEN** the response is `400` with `ok: false` and a field-level validation error, and the AI model is never called

#### Scenario: Description exceeds maximum length
- **WHEN** a client POSTs a description longer than the endpoint's configured maximum length
- **THEN** the response is `400` with `ok: false` and a validation error, and the AI model is never called

#### Scenario: AI model call fails or times out
- **WHEN** the AI model call errors, times out, or returns a response that cannot be parsed into the expected nutrition shape
- **THEN** the response is `502` with `ok: false` and an error message that does not leak upstream error internals (e.g. no raw API keys or stack traces)

### Requirement: Image-based nutrition lookup
The system SHALL expose a POST endpoint that accepts an uploaded meal photo and returns structured nutrition data estimated by the AI model for the food item(s) identified in the image.

#### Scenario: Valid image returns nutrition data
- **WHEN** a client POSTs a supported image file (JPEG or PNG) under the endpoint's size limit as multipart form data to the image lookup endpoint
- **THEN** the response is `200` with a JSON body containing `ok: true` and a `data` object listing one or more identified food items, each with estimated calories, protein, carbs, and fat, plus a total across all items

#### Scenario: Missing image is rejected
- **WHEN** a client POSTs to the image lookup endpoint with no file present
- **THEN** the response is `400` with `ok: false` and a validation error, and the AI model is never called

#### Scenario: Unsupported file type is rejected
- **WHEN** a client uploads a file whose content type is not one of the supported image types
- **THEN** the response is `400` with `ok: false` and a validation error naming the accepted types, and the AI model is never called

#### Scenario: Oversized image is rejected
- **WHEN** a client uploads an image larger than the endpoint's configured maximum size
- **THEN** the response is `400` with `ok: false` and a validation error stating the size limit, and the AI model is never called

#### Scenario: AI model cannot identify any food in the image
- **WHEN** the AI model successfully processes the image but identifies no recognizable food
- **THEN** the response is `200` with `ok: false` and an error message indicating no food was recognized (distinct from a `400`/`502` failure, since the request itself was valid)

#### Scenario: AI model call fails or times out
- **WHEN** the AI model call errors, times out, or returns a response that cannot be parsed into the expected nutrition shape
- **THEN** the response is `502` with `ok: false` and an error message that does not leak upstream error internals

### Requirement: Nutrition estimates are not persisted by these endpoints
Both lookup endpoints SHALL only return AI-estimated nutrition data to the caller; they SHALL NOT write to the `Food` or `LogEntry` tables.

#### Scenario: Successful lookup does not create a food or log entry
- **WHEN** either endpoint returns a successful nutrition estimate
- **THEN** no new `Food` row and no new `LogEntry` row exist as a result of that request
