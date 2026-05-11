import pytesseract
from PIL import Image
import pdfplumber


def extract_text_from_image(image_path):
    text = pytesseract.image_to_string(Image.open(image_path))
    return text


def extract_text_from_pdf(pdf_path):
    full_text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            full_text += page.extract_text() or ""
    return full_text