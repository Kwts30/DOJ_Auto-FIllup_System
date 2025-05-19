from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from io import BytesIO
from PIL import Image
from reportlab.lib.utils import ImageReader
import os
from pdf2image import convert_from_path
import tempfile
import requests

PDF_TEMPLATE = "templates/birth-certificate-template.pdf"

MODAL_FIELDS = [
    [
        ("name_first", "Child's First Name"),
        ("name_middle", "Child's Middle Name"),
        ("name_last", "Child's Last Name"),
        ("sex", "Sex"),
        ("birth_type", "Birth Type (Single/Twin/etc)")
    ],
    [
        ("birth_order", "If multiple, this child is (1st/2nd/etc)"),
        ("dob", "Date of Birth (MM/DD/YYYY)"),
        ("birth_time", "Hour (24-hour clock)"),
        ("birth_place", "Place of Birth (Hospital/Facility)"),
        ("birth_address", "Street Address")
    ],
    [
        ("birth_city", "City"),
        ("birth_state", "State"),
        ("mother_first", "Mother's First Name"),
        ("mother_middle", "Mother's Middle Name"),
        ("mother_last", "Mother's Last Name")
    ],
    [
        ("mother_birthplace", "Mother's Place of Birth (State/Country)"),
        ("mother_dob", "Mother's Date of Birth"),
        ("father_first", "Father's First Name"),
        ("father_middle", "Father's Middle Name"),
        ("father_last", "Father's Last Name")
    ],
    [
        ("father_birthplace", "Father's Place of Birth (State/Country)"),
        ("father_dob", "Father's Date of Birth"),
        ("issuer_name", "Issuer's Full Name"),
        ("issuer_occupation", "Issuer's Occupation"),
        ("issuer_accept_date", "Date of Acceptance (MM/DD/YYYY)")
    ]
]

COORDS = {
    "state_file_num": (634.0 * 2.83465, 1300.2 * 2.83465),
    "local_reg_num": (1985.7 * 2.83465, 1305.2 * 2.83465),
    "name_first": (763.2 * 2.83465, 1045.2 * 2.83465),
    "name_middle": (1317.9 * 2.83465, 1045.2 * 2.83465),
    "name_last": (1869.1 * 2.83465, 1045.2 * 2.83465),
    "sex": (582.7 * 2.83465, 971.6 * 2.83465),
    "birth_type": (858.6 * 2.83465, 971.6 * 2.83465),
    "birth_order": (1317.9 * 2.83465, 971.6 * 2.83465),
    "dob": (1757.0 * 2.83465, 971.6 * 2.83465),
    "birth_time": (2062.2 * 2.83465, 971.6 * 2.83465),
    "birth_place": (903.5 * 2.83465, 897.6 * 2.83465),
    "birth_address": (1760.5 * 2.83465, 896.7 * 2.83465),
    "birth_city": (901.7 * 2.83465, 822.9 * 2.83465),
    "birth_state": (1761.0 * 2.83465, 822.9 * 2.83465),
    "mother_first": (760.0 * 2.83465, 748.6 * 2.83465),
    "mother_middle": (1207.2 * 2.83465, 749.5 * 2.83465),
    "mother_last": (1574.0 * 2.83465, 750.4 * 2.83465),
    "mother_birthplace": (1907.1 * 2.83465, 750.4 * 2.83465),
    "mother_dob": (2131.1 * 2.83465, 750.4 * 2.83465),
    "father_first": (758.2 * 2.83465, 678.2 * 2.83465),
    "father_middle": (1208.1 * 2.83465, 679.1 * 2.83465),
    "father_last": (1573.1 * 2.83465, 680.0 * 2.83465),
    "father_birthplace": (1908.0 * 2.83465, 680.9 * 2.83465),
    "father_dob": (2131.1 * 2.83465, 680.0 * 2.83465),
    "issuer_name": (757.0 * 2.83465, 604.7 * 2.83465),
    "issuer_occupation": (1206.2 * 2.83465, 604.7 * 2.83465),
    "issuer_accept_date": (1986.1 * 2.83465, 605.6 * 2.83465),
    "issuer_signature": (1572.3 * 2.83465, 605.6 * 2.83465),
}

def fill_pdf(data):
    packet = BytesIO()
    can = canvas.Canvas(packet, pagesize=landscape(A4))
    font_name = 'Times-Roman'
    for modal in MODAL_FIELDS:
        for key, _ in modal:
            value = data.get(key, "")
            x, y = COORDS[key]
            can.setFont(font_name, 12)
            can.drawString(x, y, str(value))
    can.setFont(font_name, 12)
    can.drawString(COORDS["state_file_num"][0], COORDS["state_file_num"][1], data.get("state_file_num", ""))
    can.drawString(COORDS["local_reg_num"][0], COORDS["local_reg_num"][1], data.get("local_reg_num", ""))
    sig_bytes = data.get("issuer_signature")
    if sig_bytes:
        sig_img = ImageReader(BytesIO(sig_bytes))
        width_pt = 125.98 * 2.83465
        height_pt = 29.83 * 2.83465
        can.drawImage(
            sig_img,
            COORDS["issuer_signature"][0],
            COORDS["issuer_signature"][1],
            width=width_pt,
            height=height_pt,
            mask='auto'
        )
    can.save()
    packet.seek(0)
    new_pdf = PdfReader(packet)
    template_pdf = PdfReader(open(PDF_TEMPLATE, "rb"))
    output = PdfWriter()
    page = template_pdf.pages[0]
    page.merge_page(new_pdf.pages[0])
    output.add_page(page)
    out_buf = BytesIO()
    output.write(out_buf)
    out_buf.seek(0)
    return out_buf.read()

def pdf_to_image(pdf_path, image_output_path):
    images = convert_from_path(pdf_path)
    images[0].save(image_output_path, 'PNG')

def send_to_discord(image_bytes, full_name, state_code, city_code, state_file_num, local_reg_num, is_marriage=False):
    DISCORD_TOKEN = "MTM3MjA4NjE0ODQwNjU3OTI1Mg.GO22WL.CE08h3-jlF0mLLqR5nIzPZ-pBTANHZbPTXu1Kg"
    BIRTH_CHANNEL_ID = "1372548553427128340"
    MARRIAGE_CHANNEL_ID = "1373828408760471572"  # Replace with your marriage certificate channel ID

    # Select channel based on certificate type
    channel_id = MARRIAGE_CHANNEL_ID if is_marriage else BIRTH_CHANNEL_ID

    url = f"https://discord.com/api/v9/channels/{channel_id}/messages"
    headers = {
        "Authorization": f"Bot {DISCORD_TOKEN}"
    }

    cert_type = "Marriage" if is_marriage else "Birth"
    files = {
        "file": (f"{full_name}_{state_code}_{city_code}.png", image_bytes, "image/png")
    }

    data = {
        "content": f"{cert_type} Certificate for {full_name})\nState File Number: {state_file_num}\nLocal Registration Number: {local_reg_num}"
    }

    response = requests.post(url, headers=headers, data=data, files=files)

    return response.status_code == 200
