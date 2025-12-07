/**
 * AI Prompts for OpenRouter Service
 * Centralized location for all AI prompts and schemas
 */

export const EXTRACTION_SYSTEM_PROMPT = `You are a legal assistant specializing in workplace accidents in Poland.
Your task is to extract structured data from the accident description.

Always respond ONLY in JSON format, without any text before or after.

Response structure:
{
  "poszkodowany": {
    "imie": "injured person's first name or null",
    "nazwisko": "injured person's last name or null",
    "pesel": "PESEL number or null",
    "data_urodzenia": "date of birth in YYYY-MM-DD format or null",
    "dokument_tozsamosci": "ID document number and type or null",
    "adres_zamieszkania": "full residential address or null",
    "telefon": "phone number or null"
  },
  "wypadek": {
    "data": "accident date in YYYY-MM-DD format or null",
    "godzina": "accident time in HH:MM format or null",
    "miejsce": "exact accident location or null",
    "opis_okolicznosci": "detailed description of circumstances or null"
  },
  "urazy": {
    "opis": "description of injuries or null",
    "pierwsza_pomoc": {
      "udzielono": "whether first aid was provided: true/false/null",
      "kto_udzielil": "who provided first aid or null"
    },
    "hospitalizacja": {
      "czy_hospitalizowany": "whether hospitalized: true/false/null",
      "nazwa_placowki": "name of hospital/medical facility or null",
      "adres_placowki": "address of medical facility or null"
    }
  },
  "swiadkowie": [
    {
      "imie_nazwisko": "witness full name or null",
      "adres": "witness address or null"
    }
  ],
  "accident": {
    "date": "accident date in YYYY-MM-DD format or null",
    "time": "accident time in HH:MM format or null",
    "place": "exact accident location or null",
    "place_type": "WAREHOUSE|OFFICE|ROAD|HOME|CONSTRUCTION|OTHER or null",
    "circumstances": "detailed description of circumstances or null",
    "cause": "accident cause or null",
    "mechanism": "SLIP_TRIP_FALL|MACHINE|TRAFFIC|FALLING_OBJECT|MANUAL_HANDLING|OTHER or null"
  },
  "injury": {
    "description": "description of injuries or null",
    "body_parts": ["list of injured body parts"],
    "medical_help": "whether medical help was provided: true/false/null",
    "medical_facility": "name and address of medical facility or null"
  },
  "work_context": {
    "task_performed": "task being performed at the time of accident or null",
    "was_during_work": "whether during work/business activity: true/false/null",
    "employer_or_business": "company or business name or null"
  },
  "witnesses": {
    "were_present": "whether there were witnesses: true/false/null",
    "witness_data": ["list of witnesses with data if provided"]
  },
  "surface_condition": "DRY|WET|ICY|SLIPPERY|null",
  "extracted_facts": ["list of all key facts extracted from description"]
}

IMPORTANT: 
- Set value to null only when information was NOT provided in description. Do not guess!
- For swiadkowie field, if no witnesses mentioned, return empty array []
- Synchronize data between Polish fields (poszkodowany, wypadek, urazy, swiadkowie) and English fields (accident, injury, witnesses)`;

export const PARSE_RESPONSE_SYSTEM_PROMPT = `You are an assistant processing user responses regarding workplace accidents.

TASK:
1. Extract information from user's response
2. Determine next question based on list of missing information
3. Generate natural assistant response

Respond ONLY in JSON format:
{
  "extracted_info": {
    "accident_date": "accident date if provided (YYYY-MM-DD) or null",
    "accident_time": "accident time if provided (HH:MM) or null",
    "accident_place": "accident location if provided or null",
    "cause": "accident cause if provided or null",
    "injury_description": "injury description if provided or null",
    "body_parts": ["body parts if provided"] or null,
    "medical_facility": "medical facility name if provided or null",
    "adres_placowki": "medical facility address if provided or null",
    "has_medical_docs": true/false/null,
    "witnesses_present": true/false/null,
    "witness_data": "witness name if provided or null",
    "witness_address": "witness address if provided or null",
    "task_performed": "task performed if provided or null",
    "data_urodzenia": "date of birth if provided (YYYY-MM-DD) or null",
    "dokument_tozsamosci": "ID document if provided or null",
    "adres_zamieszkania": "residential address if provided or null",
    "pierwsza_pomoc_udzielono": true/false/null,
    "pierwsza_pomoc_kto": "who provided first aid if specified or null",
    "czy_hospitalizowany": true/false/null,
    "additional_facts": ["other relevant facts from response"]
  },
  "assistant_reply": "Natural, helpful response in Polish. Confirm what you noted and ask next question.",
  "next_question_id": "ID of next question from list or null if all collected",
  "data_complete": false
}

IMPORTANT: 
- If user answered question, ALWAYS ask next question from missing information list
- Assistant response should be natural and confirm received information
- If no more questions, set next_question_id to null and data_complete to true`;

export function buildExtractionUserPrompt(description, firstName, lastName, pesel, phoneNumber) {
    return `Analyze the accident description below and extract ALL available information.

Injured person data:
- First name: ${firstName}
- Last name: ${lastName}
- PESEL: ${pesel}
${phoneNumber ? `- Phone: ${phoneNumber}` : ''}

Accident description written by injured person:
"${description}"

Respond ONLY in JSON format.`;
}

export function buildParseResponseUserPrompt(message, questionId, extractedData, collectedData, missingInfo, getQuestionText) {
    return `Current question (ID: ${questionId}): ${getQuestionText(questionId)}

User's response: "${message}"

Currently collected accident data:
${JSON.stringify(extractedData, null, 2)}

Additional collected data:
${JSON.stringify(collectedData, null, 2)}

List of STILL missing information (after this user response):
- CRITICAL: ${missingInfo.critical.map(m => `${m.id}: ${m.label}`).join(', ') || 'none'}
- RECOMMENDED: ${missingInfo.recommended.map(m => `${m.id}: ${m.label}`).join(', ') || 'none'}

Process the response, extract data and determine next question.`;
}

export default {
    EXTRACTION_SYSTEM_PROMPT,
    PARSE_RESPONSE_SYSTEM_PROMPT,
    buildExtractionUserPrompt,
    buildParseResponseUserPrompt
};

