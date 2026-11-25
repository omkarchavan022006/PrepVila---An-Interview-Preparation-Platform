
from django.test import SimpleTestCase

from apps.resume_builder.pdf_service import generate_resume_pdf


class ResumePDFServiceTests(SimpleTestCase):

    def setUp(self):
        self.personal_data = {
            "full_name": "Test Candidate",
            "email": "test@example.com",
            "phone": "9876543210",
            "location": "Mumbai, India",
        }

        self.resume_content = {
            "professional_title": "Python Developer",
            "professional_summary": (
                "Motivated Python developer with "
                "experience in backend development."
            ),
            "skills": ["Python", "Django", "MongoDB"],
            "experience": [
                {
                    "job_title": "Python Developer",
                    "company": "ABC Technologies",
                    "duration": "2024 - 2025",
                    "responsibilities": [
                        "Developed REST APIs.",
                        "Worked with MongoDB.",
                    ],
                }
            ],
            "education": [
                {
                    "degree": "Bachelor of Computer Applications",
                    "institution": "ABC University",
                    "year": "2024",
                    "details": "Computer Science",
                }
            ],
            "projects": [
                {
                    "name": "AI Interview Platform",
                    "description": "An AI-powered interview preparation platform.",
                    "technologies": ["Python", "React", "MongoDB"],
                }
            ],
            "certifications": ["Python Programming"],
            "achievements": ["Completed backend development project"],
        }

    def test_pdf_generation_returns_valid_pdf(self):
        pdf_bytes = generate_resume_pdf(
            self.personal_data,
            self.resume_content,
        )

        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
        self.assertGreater(len(pdf_bytes), 500)

    def test_pdf_generation_with_empty_optional_sections(self):
        content = {
            "professional_title": "Fresher",
            "professional_summary": "Entry-level developer.",
            "skills": ["Python"],
            "experience": [],
            "education": [],
            "projects": [],
            "certifications": [],
            "achievements": [],
        }

        pdf_bytes = generate_resume_pdf(
            self.personal_data,
            content,
        )

        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))

    def test_pdf_generation_escapes_special_characters(self):
        content = {
            **self.resume_content,
            "professional_summary": (
                "Knowledge of Python <Django> & JavaScript."
            ),
        }

        pdf_bytes = generate_resume_pdf(
            self.personal_data,
            content,
        )

        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
