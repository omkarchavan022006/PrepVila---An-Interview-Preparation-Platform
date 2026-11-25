
from io import BytesIO

from pypdf import PdfReader
from docx import Document


MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def extract_resume_text(uploaded_file):
    filename = uploaded_file.name.lower()
    file_bytes = uploaded_file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError("Resume file must be smaller than 5 MB.")

    if not file_bytes:
        raise ValueError("Uploaded file is empty.")

    try:
        if filename.endswith(".pdf"):
            if not file_bytes.startswith(b"%PDF-"):
                raise ValueError("Invalid PDF file.")

            reader = PdfReader(BytesIO(file_bytes))

            if reader.is_encrypted:
                raise ValueError("Password-protected PDFs are not supported.")

            text = "\n".join(
                page.extract_text() or ""
                for page in reader.pages
            )

        elif filename.endswith(".docx"):
            if not file_bytes.startswith(b"PK"):
                raise ValueError("Invalid DOCX file.")

            document = Document(BytesIO(file_bytes))

            paragraphs = [
                paragraph.text
                for paragraph in document.paragraphs
                if paragraph.text.strip()
            ]

            table_text = []

            for table in document.tables:
                for row in table.rows:
                    table_text.append(
                        " | ".join(cell.text for cell in row.cells)
                    )

            text = "\n".join(paragraphs + table_text)

        else:
            raise ValueError("Only PDF and DOCX files are supported.")

        if not text.strip():
            raise ValueError(
                "No readable text found. Please upload a text-based PDF or DOCX."
            )

        return file_bytes, text.strip()

    except ValueError:
        raise
    except Exception as error:
        raise ValueError(
            "Unable to read this resume. Please upload a valid PDF or DOCX."
        ) from error
