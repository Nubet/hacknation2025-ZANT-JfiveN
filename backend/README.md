# ZANT Backend Server

Express.js backend with OpenRouter AI integration for the ZANT Accident Assistant.

## Features

- **AI-powered data extraction**: Parses accident descriptions using OpenRouter AI to extract structured data
- **Smart question generation**: AI generates contextual follow-up questions based on missing information
- **Response parsing**: AI extracts relevant data from user chat responses
- **Fallback mode**: Works without AI API key using rule-based logic
- **Full OpenAPI compliance**: Implements all endpoints from the specification

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment (optional, for AI features):
```bash
cp .env.example .env
# Edit .env and add your OpenRouter API key
```

3. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server runs on `http://localhost:3001` by default.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI features | - |
| `AI_MODEL` | AI model to use | `openai/gpt-4o-mini` |

## API Endpoints

### Case Management

- `POST /api/cases/init` - Create a new accident case
- `GET /api/cases/:caseId/status` - Get case status and definition evaluation
- `GET /api/cases/:caseId/documents` - Get document previews
- `POST /api/cases/:caseId/chat` - Send a chat message
- `GET /api/cases/:caseId/chat` - Get chat history

### Debug & Health

- `GET /health` - Health check with AI status
- `GET /api/debug/cases` - List all cases (for debugging)

## AI Models

Supported models via OpenRouter:
- `openai/gpt-4o-mini` (default, fast and cheap)
- `openai/gpt-4o` (better quality)
- `anthropic/claude-3-haiku-20240307` (fast)
- `anthropic/claude-3-5-sonnet-20241022` (high quality)

## Architecture

```
backend/
├── server.js                 # Express server and routes
├── services/
│   ├── caseService.js       # Case management logic
│   ├── definitionService.js # Legal definition evaluation
│   ├── documentService.js   # Document generation
│   └── openrouterService.js # AI integration
└── package.json
```

## Without AI API Key

The server works without an OpenRouter API key using fallback logic:
- Basic regex-based data extraction from descriptions
- Predefined question flow
- Rule-based response parsing

This allows testing and development without AI costs.

