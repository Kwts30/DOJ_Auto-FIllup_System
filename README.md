# DOJ Centralized System

This project is a web-based DOJ document management system with live image-based document editing and Discord integration.

## Folders
- `frontend/`: Website UI (HTML, CSS, JS)
- `backend/`: (Optional) Python backend for Discord integration (not needed for image-only editing)
- `templates/`: Old document templates (PDF/DOCX) — can be deleted if not needed
- `generated/`: Old generated PDFs — can be deleted
- `data/`: Old counters and respondents — can be deleted

## To keep for image-only editing:
- `frontend/` (all files)
- `backend/` (only if you want Discord integration)

## To delete (if you want a clean, image-only project):
- `templates/`
- `generated/`
- `data/`
- `requirements.txt` (if not using backend)
- `ngrok.exe` (if not using backend)

## Usage
1. Open `frontend/index.html` in your browser.
2. Upload your document template image and edit fields live on the canvas.
3. (Optional) Use backend for Discord integration.

---

**You can now safely delete the following folders/files for a pure image-based web editor:**
- `templates/`
- `generated/`
- `data/`
- `requirements.txt`
- `ngrok.exe`

# Birth Certificate Bot

## How to Run the Backend (FastAPI)

1. Open a terminal.
2. Change directory to the backend folder:
   ```sh
   cd "D:/Documents/city server bot/birth certificate bot/backend"
   ```
3. Start the FastAPI server with Uvicorn:
   ```sh
   uvicorn app:fastapi_app --reload
   ```
   - `app` is the filename (app.py)
   - `fastapi_app` is the FastAPI instance in the file
   - `--reload` enables auto-reload on code changes (for development)

## How to Run the Frontend

- Open `frontend/index.html` in your browser (or use a local server like Live Server in VSCode).

## Notes
- Make sure you have Python and all dependencies installed (`pip install fastapi uvicorn` and others as needed).
- If you see CORS errors, make sure the backend is running with the CORS middleware enabled (already set up in app.py).

---

If you forget the command, check this README! 😄


cd "D:/Documents/city server bot/birth certificate bot/backend"
uvicorn app:fastapi_app --reload