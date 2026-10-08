# VISIONAI — Conversational Image Recognition & Visual Intelligence Platform

VISIONAI is an enterprise-grade, full-stack visual intelligence and multimodal conversational platform built with the Stitch Design System, Next.js, FastAPI, Google Gemini Multimodal VLM, Ultralytics YOLOv8, Optical Character Recognition (OCR), and Supabase.

---

## 🌟 Architecture Overview

```
                    USER
                     |
                     ▼
          EXISTING STITCH UI (Next.js)
                     |
                     ▼
             FASTAPI BACKEND API
                     |
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
  GEMINI           YOLO             OCR
 Multimodal VLM   Detection        Text
     │               │               │
     └───────────────┼───────────────┘
                     ▼
              CONTEXT FUSION
                     |
                     ▼
            CONVERSATIONAL MEMORY
                     |
                     ▼
            SUPABASE POSTGRESQL
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Database   Storage     Auth
```

---

## 🚀 Key Features

1. **Stitch Dark Glassmorphic Design System**: Luminous deep canvas (`#080B14`), Spectral Violet accents (`#8B5CF6`), Cyan telemetry indicators (`#22D3EE`), and Plus Jakarta Sans typography.
2. **Gemini Multimodal VLM Intelligence**: High-accuracy visual question answering, reasoning over scene composition, follow-up memory without image re-upload.
3. **YOLOv8 Object Detection**: Real-time bounding box isolation, object entity tags, and calibrated confidence levels.
4. **OCR Text Extraction**: Transcribes typography, signs, and labels from uploaded visuals into structured text.
5. **Conversational Memory**: Full multi-turn dialog context retained across questions regarding the same visual asset.
6. **Live Camera Capture**: Integrated viewfinder with HUD targeting reticle using browser `MediaDevices` API.
7. **Comparative Telemetry**: Side-by-side multimodal image comparison isolating similarities and structural differences.
8. **Real-time Insights Dashboard**: Aggregated database statistics, object category distributions, and activity feeds.
9. **Supabase Authentication & RLS**: Complete Row Level Security, user profile management, and storage bucket setup.

---

## 🛠️ Project Structure

```
ESEC/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── conversations.py
│   │   │   ├── images.py
│   │   │   ├── chat.py
│   │   │   ├── compare.py
│   │   │   └── insights.py
│   │   ├── services/
│   │   │   ├── gemini_service.py
│   │   │   ├── yolo_service.py
│   │   │   ├── ocr_service.py
│   │   │   ├── vision_service.py
│   │   │   ├── storage_service.py
│   │   │   └── conversation_service.py
│   │   ├── models/
│   │   │   └── schemas.py
│   │   ├── utils/
│   │   │   ├── image_utils.py
│   │   │   └── security.py
│   │   ├── config.py
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx (Landing Page)
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── app/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx (Workspace)
│   │   │       ├── chat/[conversationId]/page.tsx
│   │   │       ├── history/page.tsx
│   │   │       ├── insights/page.tsx
│   │   │       ├── settings/page.tsx
│   │   │       └── profile/page.tsx
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── AnalysisPanel.tsx
│   │   │   ├── ObjectOverlay.tsx
│   │   │   ├── CameraCapture.tsx
│   │   │   └── ImageComparisonModal.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── supabase.ts
│   │   └── types/
│   │       └── index.ts
│   └── package.json
├── supabase/
│   └── schema.sql
├── .env.example
└── README.md
```

---

## ⚡ Quick Start & Local Execution

### 1. Backend Setup

```bash
# In project root:
cd backend

# Create & activate Python virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be live at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
# In frontend directory:
cd frontend

# Install packages
npm install

# Start Next.js Development Server
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🗄️ Database Setup (Supabase)

1. Create a new Supabase project at [https://supabase.com](https://supabase.com).
2. Navigate to **SQL Editor** in your Supabase dashboard.
3. Paste the complete contents of `supabase/schema.sql` and run it.
4. Copy your Supabase Project URL, Anon Key, and Service Role Key into your `.env` configuration.
