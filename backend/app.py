from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from bot_utils import send_to_discord

fastapi_app = FastAPI()

# Add CORS middleware
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this to ["http://127.0.0.1:5501"] for more security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@fastapi_app.post("/api/birth-certificate/preview")
async def birth_cert_preview(image: UploadFile):
    # Simply return a success response for the preview endpoint
    return JSONResponse({"message": "Preview received successfully!"})

@fastapi_app.post("/api/birth-certificate/submit")
async def birth_cert_submit(
    image: UploadFile,
    name_first: str = Form(...),
    name_middle: str = Form(...),
    name_last: str = Form(...),
    birth_state: str = Form(...),
    birth_city: str = Form(...),
    state_file_num: str = Form(...),
    local_reg_num: str = Form(...)
):
    # Read the image bytes
    img_bytes = await image.read()

    # Construct the child full name
    child_full_name = f"{name_first}_{name_middle}_{name_last}"

    # Send the image to Discord with certificate numbers
    sent = send_to_discord(
        img_bytes, 
        child_full_name, 
        birth_state, 
        birth_city,
        state_file_num,
        local_reg_num
    )

    if sent:
        return JSONResponse({"message": "Birth certificate sent to Discord!"})
    else:
        return JSONResponse({"message": "Failed to send to Discord."}, status_code=500)