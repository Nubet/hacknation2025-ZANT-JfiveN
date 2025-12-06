# ZANT Incident Assistant – System Design Document (MVP v1.1, JfiveN)

## 1. Product context and goals

ZANT is a web assistant that helps self-employed people after an accident to:

* collect all information required by ZUS in a structured way,
* evaluate whether the legal definition of an accident is likely met,
* generate drafts of formal documents: notification and written explanation.

System operates on two data layers:

1. Raw narrative – free text description written by the user.
2. Canonical case JSON – structured data aligned with ZUS forms.

Decision about meeting the definition is based on a deterministic decision tree. AI is only used to classify the narrative into predefined categories and optionally to refine language, never to invent new facts.

---

## 2. Scope and constraints

### 2.1. In scope (MVP)

1. Step 1 – initial form

* Collect personal data of the injured person.
* Collect free text description of the accident.
* Create a new case with raw narrative and initial canonical JSON.

2. Step 2 – accident assistant

* Conversational refinement of the case:

  * assistant asks focused questions about injuries, witnesses, BHP, intoxication, travel to work etc.
* Status panel:

  * four tiles for legal elements: suddenness, external cause, injury, connection to work,
  * progress percentage,
  * list of missing information,
  * list of required documents.
* Document area:

  * HTML preview of notification draft,
  * HTML preview of explanation draft,
  * official style summary of the event.

3. Preliminary decision

* Evaluate whether the accident likely meets the legal definition:

  * ELIGIBLE,
  * PROBABLY_ELIGIBLE,
  * UNCLEAR,
  * PROBABLY_NOT_ELIGIBLE.
* Keep internal trace of decision tree traversal for future ZUS view.

### 2.2. Out of scope

* Production grade authentication and integration with PUE.
* Stage II workflows inside ZUS (accident cards, medical opinions).
* OCR or automatic processing of scanned documents.
* Runtime LLM integration as a hard requirement. It remains an extension point.

### 2.3. Technical constraints

* Backend: single Spring Boot application.
* Frontend: static HTML screens (`screen1-opis.html`, `screen2-szczegoly.html`) plus minimal JavaScript using `fetch`.
* Persistence: relational database (Postgres for demo, H2 for local), JSON stored in text or JSONB column.
* Interface: REST, JSON over HTTP.
* No hard requirement for authentication in MVP. Case is addressed by caseId in URL.

---

## 3. Stakeholders and personas

### 3.1. Primary user

Self-employed person after an accident, with limited legal knowledge, needing help with:

* understanding what information is required,
* checking if the event likely qualifies,
* generating formal documents.

### 3.2. Secondary stakeholder

ZUS employee or hackathon juror:

* wants to see that the assistant collects all required data,
* wants to see how the system evaluates the four elements,
* wants to see clear and structured outputs usable in real workflows.

MVP UI is focused on the primary user. ZUS view is planned but not implemented in this iteration.

---

## 4. User stories and acceptance criteria

### US1 – Submit initial data and description

As an injured self-employed person
I want to fill in my personal details and a free description of the accident
so that the system can start building my case.

Acceptance:

* Form contains first name, last name, PESEL, optional phone, text area for description.
* On submit, backend creates a case with a unique caseId.
* User is redirected to `/case/{caseId}`.

### US2 – View structured status of my case

As the injured person
I want to see a clear status panel of my case
so that I know what is already captured and what is missing.

Acceptance:

* Panel shows:

  * caseId,
  * progress percentage,
  * four definition tiles with status and short explanation,
  * list of required missing information,
  * list of required documents.
* Data is taken from backend via `/api/cases/{id}/status`.

### US3 – Refine my case via chat

As the injured person
I want to answer simple questions in a chat interface
so that the system can fill all important details without long forms.

Acceptance:

* I see initial assistant message summarising the understanding of my description.
* Each answer I send results in:

  * new assistant message,
  * updated definition tiles,
  * updated missing information and documents,
  * updated document previews.
* Conversation is driven by backend deciding the next questionId.

### US4 – Understand legal definition coverage

As the injured person
I want to see how my case fits the four elements of the accident definition
so that I see potential weak points in my situation.

Acceptance:

* For each element (suddenness, external cause, injury, work relation) I see:

  * status: EMPTY, PARTIAL, COMPLETE,
  * one sentence explanation.
* Changes in my answers can move elements from EMPTY to PARTIAL or COMPLETE.

### US5 – See missing information and required documents

As the injured person
I want to see clearly which information and documents are missing
so that I can gather them before submitting to ZUS.

Acceptance:

* Panel lists missing information in two groups: required and recommended.
* Panel lists document types that should be prepared.
* Lists change dynamically after new answers in chat.

### US6 – See a preliminary decision

As the injured person
I want to see a preliminary assessment whether my accident likely meets the legal definition
so that I know what to expect when submitting my documents.

Acceptance:

* Status panel shows preliminary result:

  * ELIGIBLE, PROBABLY_ELIGIBLE, UNCLEAR, or PROBABLY_NOT_ELIGIBLE.
* Panel shows a short summary explanation in natural language.
* Result is computed by deterministic decision tree, not directly by AI.

### US7 – Preview generated notification and explanation

As the injured person
I want to preview generated drafts of notification and explanation
so that I can quickly adapt them and submit to ZUS.

Acceptance:

* Document area contains:

  * preview of notification text,
  * preview of explanation text,
  * official style summary.
* Texts are based on structured JSON plus fields collected in chat.
* On each chat turn, previews are updated.

### US8 – Download documents

As the injured person
I want to download the documents in a standard format
so that I can print or attach them in electronic channels.

Acceptance:

* There are download buttons for at least PDF format for both documents.
* Minimal version in MVP: same HTML content rendered as simple PDF.

---

## 5. Domain model

### 5.1. Case aggregate

Case is the main aggregate for one accident.

```text
Case
  id: String                        // e.g. "ZANT/2025/000123"
  createdAt: Instant
  updatedAt: Instant

  rawNarrative: String              // exactly what user wrote in Step 1

  payloadJson: text / JSONB         // canonical JSON aligned with ZUS forms

  definitionStatus: DefinitionStatusSummary
  progressPercent: int              // 0–100

  missingInfoSummary: MissingInfoSummary
  documentsSummary: DocumentsSummary

  decisionSnapshot: DecisionSnapshot
```

### 5.2. Canonical case JSON

Stored inside `Case.payloadJson`. Top level sections:

```jsonc
{
  "injured_person": { ... },
  "injured_person_addresses": { ... },
  "business_address": { ... },
  "reporting_person": { ... },
  "accident": { ... },
  "witnesses": [ ... ],
  "injured_person_statement": { ... },
  "witness_or_family_statement": { ... },
  "additional_documents": { ... },
  "analysis": {
    "features": { ... }
  }
}
```

The structure is aligned with ZUS documentation and contains:

* personal and address data,
* accident date, time, place, circumstances, cause,
* injuries and medical help,
* witnesses and their addresses,
* detailed statement with BHP, intoxication, authorities actions,
* additional documents related to business activity, medical care, police, prosecutors.

### 5.3. Features layer

Section `analysis.features` holds interpreted categories derived from raw narrative or answers:

```text
CaseFeatures
  timeOfDay: enum { MORNING, AFTERNOON, EVENING, NIGHT, UNKNOWN }
  environmentType: enum { WAREHOUSE, OFFICE, ROAD, HOME, OTHER, UNKNOWN }
  surfaceCondition: enum { DRY, WET, ICY, UNKNOWN }
  mechanismCategory: enum { SLIP_TRIP_FALL, MACHINE, TRAFFIC, OTHER, UNKNOWN }
  intoxicationStatus: enum { SOBER, INTOXICATED, UNKNOWN }
  commuteContext: enum { GOING_TO_WORK, COMING_FROM_WORK, WORK_TASK, OTHER, UNKNOWN }
```

These features are:

* derived by heuristics in MVP,
* later can be refined by AI classification, always into the same finite sets.

### 5.4. Definition status

Captures the coverage of four legal elements.

```text
DefinitionStatusSummary
  suddenness: ElementStatus
  externalCause: ElementStatus
  injury: ElementStatus
  workRelation: ElementStatus

ElementStatus
  status: enum { EMPTY, PARTIAL, COMPLETE }
  explanation: String
```

### 5.5. Missing information and documents

```text
MissingInfoSummary
  requiredMissing: List<String>
  recommendedMissing: List<String>
  documentsNeeded: List<String>
```

This is derived from canonical JSON and the definition status.

### 5.6. Documents summary

```text
DocumentsSummary
  notificationPreviewHtml: String
  explanationPreviewHtml: String
  officialSummary: String
```

Generation is based exclusively on canonical JSON and decision outcome.

### 5.7. Chat and conversation

```text
ChatTurn
  id: Long
  caseId: String
  role: enum { USER, ASSISTANT, SYSTEM }
  content: String
  questionId: String?                // identifier from question catalog
  createdAt: Instant

ConversationState
  caseId: String
  currentQuestionId: String
  askedQuestionIds: Set<String>
```

Conversation state is used by the backend to select the next question and to map user messages to JSON updates.

---

## 6. Decision tree model

### 6.1. Tree structures

Decision tree is defined as data, not code, to allow further extension.

```text
DecisionTree
  id: String                         // "ACCIDENT_BENEFIT_V1"
  rootNodeId: String

DecisionNode
  id: String
  type: enum { RULE_NODE, LEAF }
  questionCode: String               // e.g. "IS_SUDDEN", "HAS_EXTERNAL_CAUSE"
  description: String
  evaluationRule: RuleExpression?    // only for RULE_NODE
  branches: List<DecisionBranch>     // only for RULE_NODE
  decisionOutcome: DecisionOutcome?  // only for LEAF

DecisionBranch
  conditionValue: enum { YES, NO, UNKNOWN }
  nextNodeId: String

DecisionOutcome
  result: enum { ELIGIBLE, PROBABLY_ELIGIBLE, UNCLEAR, PROBABLY_NOT_ELIGIBLE }
  reasonCodes: List<String>
```

RuleExpression is implemented either as:

* simple DSL evaluated on JSON and features, or
* mapping to named predicates in Java.

### 6.2. Decision snapshot in case

Result per case:

```text
DecisionSnapshot
  treeId: String
  outcome: DecisionOutcome
  nodeTrace: List<DecisionNodeTrace>

DecisionNodeTrace
  nodeId: String
  questionCode: String
  evaluatedValue: enum { YES, NO, UNKNOWN }
  ruleExplanation: String
```

Trace is not shown in MVP user view. It is stored for future ZUS view and debugging.

---

## 7. Services

### 7.1. CaseService

Responsibilities:

* create new Case with initial payloadJson,
* fetch Case,
* compute status and documents for API responses.

Key operations:

```text
Case createCase(InitialFormData formData)

Case getCaseById(String caseId)

CaseStatusResponse getCaseStatus(String caseId)

DocumentsPreviewResponse getDocuments(String caseId)
```

### 7.2. NarrativeClassificationService

Responsibilities:

* analyse rawNarrative,
* produce CaseFeatures.

Signature:

```text
CaseFeatures classify(String rawNarrative)
```

MVP implementation:

* regex and keyword heuristics, no external calls.

Future:

* optional LLM integration that returns strict JSON with same enums.

### 7.3. DefinitionEvaluationService

Responsibilities:

* compute four ElementStatus values using payloadJson and features.

Signature:

```text
DefinitionStatusSummary evaluate(JsonNode payloadJson)
```

Examples:

* suddenness: date and time present,
* external cause: mechanism description and category present,
* injury: injury text plus any medical data,
* work relation: tasks and place consistent with business activity.

### 7.4. MissingInfoService

Responsibilities:

* derive MissingInfoSummary from JSON and definition status.

Signature:

```text
MissingInfoSummary compute(JsonNode payloadJson, DefinitionStatusSummary def)
```

Examples:

* requiredMissing contains witness data when accident description suggests presence of others and witnesses array is empty,
* documentsNeeded contains medical documentation when injuries are present.

### 7.5. DecisionTreeEngine

Responsibilities:

* execute decision tree on case JSON and features,
* produce DecisionSnapshot.

Signature:

```text
DecisionSnapshot run(DecisionTree tree, JsonNode payloadJson)
```

Engine is deterministic and side effect free. It is called after each significant update of the payload.

### 7.6. OfficialSummaryService

Responsibilities:

* build concise official style summary text.

Signature:

```text
String buildOfficialSummary(JsonNode payloadJson, CaseFeatures features, DecisionOutcome outcome)
```

MVP implementation:

* straightforward template based text, assembled from known sections:

  * time and place,
  * task at time of accident,
  * mechanism,
  * injuries and medical help,
  * witnesses and authorities.

### 7.7. DocumentGenerationService

Responsibilities:

* generate previews of notification and explanation.

Signature:

```text
DocumentsSummary generateDocuments(JsonNode payloadJson, String officialSummary)
```

Implementation:

* template engine (e.g. Thymeleaf or Mustache) populated from canonical JSON.

### 7.8. ChatService

Responsibilities:

* handle a chat turn:

  * persist ChatTurn,
  * map message to JSON updates based on questionId,
  * call classification, evaluation, decision, summary and document services,
  * choose next question.

Signature:

```text
ChatResponse handleChat(String caseId, ChatRequest request)
```

---

## 8. REST API surface

The API is defined in OpenAPI under the name JfiveN – ZANT Accident Assistant API.

Main endpoints:

1. `POST /api/cases/init`

   * input: `InitialCaseRequest` (first name, last name, pesel, phone, description),
   * output: `InitialCaseResponse` with `caseId` and `createdAt`.

2. `GET /api/cases/{caseId}/status`

   * output: `CaseStatusResponse` with:

     * progressPercent,
     * `DefinitionStatusSummary`,
     * `MissingInfoSummary`,
     * `EntitlementDecision`.

3. `GET /api/cases/{caseId}/documents`

   * output: `DocumentsPreviewResponse` with:

     * `notificationHtml`,
     * `explanationHtml`,
     * `officialSummary`.

4. `POST /api/cases/{caseId}/chat`

   * input: `ChatRequest` (message, optional questionId),
   * output: `ChatResponse` with:

     * assistantReply,
     * nextQuestionId,
     * updated caseStatus,
     * updated missingInfo,
     * updated documentsPreview.

Errors use `ErrorResponse` with code, message, optional details.

---

## 9. Flow descriptions

### 9.1. Step 1 flow

1. User opens `/` and sees Step 1 form.
2. User submits form.
3. Frontend sends `InitialCaseRequest` to `/api/cases/init`.
4. Backend:

   * creates Case with rawNarrative and initial payloadJson,
   * classifies narrative into CaseFeatures,
   * evaluates definition status,
   * computes missing info,
   * runs decision tree,
   * builds summary and documents,
   * persists Case.
5. Backend returns `caseId`.
6. Frontend redirects to `/case/{caseId}`.

### 9.2. Step 2 initial load

1. User opens `/case/{caseId}`.
2. Frontend:

   * calls `/api/cases/{caseId}/status` and renders panel,
   * calls `/api/cases/{caseId}/documents` and renders document previews,
   * renders pre-seeded chat history if needed.

### 9.3. Single chat turn

1. User writes an answer and clicks send.
2. Frontend sends `POST /api/cases/{caseId}/chat` with message and current questionId.
3. Backend:

   * saves ChatTurn,
   * updates payloadJson fields for this question,
   * optionally reclassifies features if needed,
   * re-evaluates definition, missing info, decision,
   * rebuilds summary and documents,
   * selects next questionId,
   * creates assistant reply.
4. Backend returns `ChatResponse`.
5. Frontend:

   * appends user and assistant bubbles,
   * updates status panel and document previews with data from response.

---

## 10. Non functional aspects

### 10.1. Security

* Communication over HTTPS on public demo.
* No user accounts in MVP, case is accessed by opaque `caseId` string.
* Access logs should avoid storing full sensitive payloads.

### 10.2. Privacy

* Canonical JSON contains personal data and should be handled as sensitive.
* Simple admin task for anonymising or deleting all cases after hackathon.

### 10.3. Performance

* Only single user flows during demo.
* Decision tree and evaluation logic are O(number of nodes) and cheap.
* No heavy external dependencies required in MVP.

### 10.4. Extensibility

* Decision tree is defined as data, not code.
* CaseFeatures and question catalog can be extended without breaking API.
* AI integration can be plugged into NarrativeClassificationService and OfficialSummaryService without changing the contract.

---

