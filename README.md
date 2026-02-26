# TextAnalyzer — AI-Powered Text Processing Platform

> 🆓 **Free-first architecture** — no paid AI API key required for core features.

A professional fullstack web application for OCR text extraction, grammar checking, AI paraphrasing, multilingual translation, and a dedicated document reader.

**Stack:** React 18 + FastAPI + MongoDB Atlas (free)

---

## ✨ Features — Free-first, production-ready

| Feature | Technology | Cost | Limit |
|---------|-----------|------|-------|
| 🔍 **OCR** | **OCR.Space free provider** (backend) | **FREE** | Unlimited |
| ✓ **Grammar Check** | Backend free providers + local correction fallback | **FREE** | Unlimited |
| ✨ **Paraphrase** | Backend rewrite pipeline + local style fallback | **FREE** | Unlimited |
| 🌐 **Translation** | `deep-translator` chain + local dictionary fallback | **FREE** | Unlimited |
| 📖 **Document Reader** | Frontend native reader (`pdfjs-dist`, `mammoth`) + embedded fallback | **FREE** | Unlimited |
|  **Export** | Client-side (TXT) + Backend (PDF/DOCX) | **FREE** | Unlimited |
| 🕐 **History** | MongoDB Atlas M0 | **FREE** | 512MB storage |
| 👤 **Auth** | JWT + MongoDB | **FREE** | Unlimited users |

Single-provider deployment is supported via backend free provider mode:
- OCR: OCR.Space (free)
- Grammar: LanguageTool public API
- Paraphrase/Translate: deep-translator (free)

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or free Atlas)

### 1. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URL and JWT_SECRET
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## 🔑 What You Need to Set Up (single free provider)

### REQUIRED

#### 1. MongoDB Database — FREE
**Option A: MongoDB Atlas (recommended)**
1. Go to https://cloud.mongodb.com/
2. Create free account → Build a Database → **M0 Free** cluster
3. Create database user → Get connection string
4. Add to `.env`:

```env
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=text_analyzer
```

If your network has TLS/DNS issues with Atlas, add local fallback:

```env
MONGODB_URL_FALLBACK=mongodb://localhost:27017
```

**Option B: Local MongoDB**

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=text_analyzer
```

#### 2. JWT Secret Key — FREE

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Add to `.env`:

```env
JWT_SECRET=paste-your-generated-key-here
```

#### 3. Free OCR provider key (optional but recommended)

```env
OCR_PROVIDER=ocr_space
OCR_SPACE_API_KEY=helloworld
TEXT_PROVIDER_MODE=free_single
```

---

## 🏗️ Architecture

```text
User Browser (React)
    │
    ├── Reader Layer (Frontend)
    │   ├── PDF rendering: pdfjs-dist (canvas + toolbar + annotations)
    │   ├── DOCX parsing: mammoth
    │   ├── TXT/MD/CSV/LOG/RTF parsing: browser text decoding
    │   └── Embedded fallback viewer for unsupported binary rendering
    │
    └── FastAPI Backend (core processing)
        ├── Authentication (JWT)
        ├── History storage (MongoDB)
        ├── Grammar / Paraphrase / Translation
        ├── OCR fallback processing
        └── Export (PDF/DOCX/TXT)
```

### Reader libraries / APIs used
- [`pdfjs-dist`](frontend/package.json:16) — native in-browser PDF rendering
- [`mammoth`](frontend/package.json:15) — DOCX text extraction for reader mode
- [`jszip`](frontend/package.json:16) — OpenXML (`.docx`) unzip + `word/document.xml` parsing
- Browser File APIs (`FileReader`, `ArrayBuffer`, `Blob URL`) for local read-only file handling

---

## 🧠 Universal Reader & Editor (MVP Foundation)

Implemented a new production-oriented module with Unified AST, parser registry, worker parsing, canvas rendering, virtualization, annotation engine, and search:

- Unified AST types: [`DocumentAst`](frontend/src/universal-reader/types/ast.ts:95), [`SectionNode`](frontend/src/universal-reader/types/ast.ts:76), [`BlockNode`](frontend/src/universal-reader/types/ast.ts:73)
- TXT streaming parser (chunk-based): [`parseTxtStream()`](frontend/src/universal-reader/core/parsers/txt/streamingTxtParser.ts:11)
- Markdown adapter: [`parseMarkdown()`](frontend/src/universal-reader/core/parsers/markdown/markdownParser.ts:12)
- DOCX OpenXML parser: [`parseDocx()`](frontend/src/universal-reader/core/parsers/docx/docxParser.ts:44)
- Parser registry + format detection: [`parseWithRegistry()`](frontend/src/universal-reader/core/parsers/registry/parserRegistry.ts:36), [`detectFormat()`](frontend/src/universal-reader/core/parsers/registry/parserRegistry.ts:32)
- Worker parser pipeline: [`self.onmessage`](frontend/src/universal-reader/workers/parser.worker.ts:6)
- Layout engine + virtual selection: [`buildLayout()`](frontend/src/universal-reader/rendering/layout-engine/layoutEngine.ts:44), [`getVisibleBlocks()`](frontend/src/universal-reader/rendering/layout-engine/layoutEngine.ts:120), [`computeVirtualSlice()`](frontend/src/universal-reader/rendering/virtualization/viewport.ts:7)
- Canvas renderer: [`renderDocumentToCanvas()`](frontend/src/universal-reader/rendering/canvas-renderer/canvasRenderer.ts:81)
- Annotation engine (highlight/pen/comment): [`applyPointerTool()`](frontend/src/universal-reader/annotation/annotation-engine/annotationEngine.ts:75)
- Search engine: [`searchLayoutBlocks()`](frontend/src/universal-reader/core/search/searchEngine.ts:27), [`searchAst()`](frontend/src/universal-reader/core/search/searchEngine.ts:65)
- Zustand state orchestration: [`useUniversalReaderStore`](frontend/src/universal-reader/stores/universalReaderStore.ts:50)
- Reader shell UI: [`UniversalReaderShell`](frontend/src/universal-reader/ui/UniversalReaderShell.tsx:10)

### Security baseline
- HTML sanitization + script stripping: [`sanitizeHtmlContent()`](frontend/src/universal-reader/core/parsers/utils/sanitize.ts:1)
- XML parser validation for DOCX: [`parseWordXmlToBlocks()`](frontend/src/universal-reader/core/parsers/docx/docxParser.ts:11)

### Route
- Added universal route: [`/universal-reader`](frontend/src/App.jsx:46)

---

## 🎨 Design System

**Colors:** Navy Blue `#0D2461` + White `#FFFFFF` + Soft Gray `#F5F7FA`
**Font:** Inter (Google Fonts)

---

## 🐳 Docker

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with MongoDB URL and JWT secret
docker-compose up -d
```

---

## 💰 Cost Summary

| Service | Provider | Cost |
|---------|----------|------|
| AI OCR | OCR.Space free tier | **$0** |
| AI text tools | LanguageTool public + deep-translator | **$0** |
| Document Reader | pdfjs-dist + mammoth (client-side) | **$0** |
| Database | MongoDB Atlas M0 | **$0** |
| Backend hosting | Your server / free tier | **$0** |
| Frontend hosting | Vercel / Netlify free | **$0** |
| **TOTAL** | | **$0/month** |

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/history` | Get history |
| DELETE | `/api/history/{id}` | Delete item |
| POST | `/api/export` | Export results |
| GET | `/health` | Health check |

Swagger UI: http://localhost:8000/docs

---

## 📁 Project Structure (updated)

```text
frontend/src/
  universal-reader/
    core/
      ast/
        nodeFactory.ts
      model/
        documentSession.ts
      parsers/
        docx/
          docxParser.ts
        markdown/
          markdownParser.ts
        registry/
          parserRegistry.ts
        text/
          plainTextParser.ts
        txt/
          streamingTxtParser.ts
        utils/
          fileType.ts
          sanitize.ts
      search/
        searchEngine.ts
    annotation/
      annotation-engine/
        annotationEngine.ts
      storage/
        annotationStorage.ts
    rendering/
      canvas-renderer/
        canvasRenderer.ts
      layout-engine/
        layoutEngine.ts
        incrementalLayout.ts
      text-layer/
        textLayer.ts
      virtualization/
        viewport.ts
    stores/
      universalReaderStore.ts
    styles/
      universalReader.css
    types/
      ast.ts
      annotation.ts
      layout.ts
      worker.ts
    ui/
      toolbar/
        ReaderToolbar.tsx
      sidebar/
        SearchPanel.tsx
      viewer/
        CanvasViewer.tsx
      UniversalReaderShell.tsx
    workers/
      parser.worker.ts
  pages/
    DocumentReaderPage.jsx   # dedicated reader UI (toolbar, fullscreen, annotations)
    UniversalReaderPage.jsx  # new Universal Reader MVP shell
    DocumentReaderPage.css   # reader styling
  services/
    documentReader.js        # file parsing pipeline (pdf/docx/doc/txt/...)
```

---

## 🛣️ Universal Reader Roadmap

### Phase 1 (Completed MVP foundation)
- Unified AST + parser registry + worker pipeline
- TXT streaming parser, Markdown adapter, DOCX OpenXML parser
- Canvas render path + basic virtualization + annotation + search

### Phase 2
- Advanced DOCX editing model (runs/styles/tables fidelity)
- Virtual page cache + differential relayout
- Indexed search + jump-to-hit navigation + selection mapping

### Phase 3
- PDF AST bridge + full Acrobat-grade interaction layer
- ODT native parser
- Collaboration/export layers and persistent annotation backend

### Trade-offs (current MVP)
- Chosen hybrid strategy: robust text/document formats first, full PDF AST deferred to Phase 3 to avoid premature complexity.
- Canvas-first rendering improves scalability for large docs, but rich semantic editing UX still requires more DOM/text-layer synchronization work in next phases.
