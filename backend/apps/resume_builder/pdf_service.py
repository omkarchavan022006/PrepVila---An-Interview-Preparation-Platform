
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    KeepTogether,
)


def generate_resume_pdf(personal_data, resume_content):
    buffer = BytesIO()

    full_name = personal_data.get("full_name", "Resume")

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"{full_name} - Resume",
        author=full_name,
        subject="Professional Resume",
    )

    styles = getSampleStyleSheet()

    name_style = ParagraphStyle(
        "CandidateName",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=23,
        leading=28,
        textColor=colors.HexColor("#28204A"),
        alignment=TA_LEFT,
        spaceAfter=5,
    )

    title_style = ParagraphStyle(
        "ProfessionalTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#8055E8"),
        spaceAfter=7,
    )

    contact_style = ParagraphStyle(
        "Contact",
        parent=styles["Normal"],
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#555555"),
        spaceAfter=8,
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#8055E8"),
        spaceBefore=12,
        spaceAfter=5,
    )

    body_style = ParagraphStyle(
        "ResumeBody",
        parent=styles["BodyText"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#292929"),
        spaceAfter=4,
    )

    small_style = ParagraphStyle(
        "ResumeSmall",
        parent=body_style,
        fontSize=8.5,
        leading=12,
    )

    story = []

    def safe(value):
        return escape(str(value or ""))

    def add_section(title):
        story.append(
            Paragraph(safe(title.upper()), heading_style)
        )

        story.append(
            HRFlowable(
                width="100%",
                thickness=0.7,
                color=colors.HexColor("#DED6F5"),
                spaceAfter=6,
            )
        )

    def add_text(value, style=body_style):
        if value:
            story.append(
                Paragraph(safe(value), style)
            )

    def add_bullets(items):
        for item in items or []:
            if item:
                story.append(
                    Paragraph(
                        f"&bull; {safe(item)}",
                        small_style,
                    )
                )

    # HEADER
    add_text(full_name, name_style)

    add_text(
        resume_content.get("professional_title"),
        title_style,
    )

    contact_parts = [
        personal_data.get("email"),
        personal_data.get("phone"),
        personal_data.get("location"),
    ]

    contact = " | ".join(
        safe(item)
        for item in contact_parts
        if item
    )

    if contact:
        story.append(
            Paragraph(contact, contact_style)
        )

    story.append(Spacer(1, 4))

    # PROFESSIONAL SUMMARY
    summary = resume_content.get("professional_summary")

    if summary:
        add_section("Professional Summary")
        add_text(summary)

    # SKILLS
    skills = resume_content.get("skills", [])

    if skills:
        add_section("Technical Skills")

        skill_text = "  •  ".join(
            safe(skill) for skill in skills
        )

        story.append(
            Paragraph(skill_text, small_style)
        )

    # WORK EXPERIENCE
    experience = resume_content.get("experience", [])

    if experience:
        add_section("Work Experience")

        for item in experience:
            if not isinstance(item, dict):
                continue

            section = []

            heading = " | ".join(
                safe(item.get(key))
                for key in ("job_title", "company")
                if item.get(key)
            )

            if heading:
                section.append(
                    Paragraph(
                        f"<b>{heading}</b>",
                        body_style,
                    )
                )

            if item.get("duration"):
                section.append(
                    Paragraph(
                        safe(item["duration"]),
                        small_style,
                    )
                )

            for responsibility in item.get(
                "responsibilities", []
            ):
                if responsibility:
                    section.append(
                        Paragraph(
                            f"&bull; {safe(responsibility)}",
                            small_style,
                        )
                    )

            if section:
                story.append(KeepTogether(section))
                story.append(Spacer(1, 5))

    # EDUCATION
    education = resume_content.get("education", [])

    if education:
        add_section("Education")

        for item in education:
            if not isinstance(item, dict):
                continue

            add_text(item.get("degree"), body_style)
            add_text(item.get("institution"), small_style)

            details = " | ".join(
                safe(item.get(key))
                for key in ("year", "details")
                if item.get(key)
            )

            if details:
                story.append(
                    Paragraph(details, small_style)
                )

            story.append(Spacer(1, 4))

    # PROJECTS
    projects = resume_content.get("projects", [])

    if projects:
        add_section("Projects")

        for item in projects:
            if not isinstance(item, dict):
                continue

            add_text(item.get("name"), body_style)
            add_text(item.get("description"), small_style)

            technologies = item.get("technologies", [])

            if technologies:
                technology_text = ", ".join(
                    safe(technology)
                    for technology in technologies
                )

                add_text(
                    f"Technologies: {technology_text}",
                    small_style,
                )

            story.append(Spacer(1, 4))

    # CERTIFICATIONS
    certifications = resume_content.get("certifications", [])

    if certifications:
        add_section("Certifications")
        add_bullets(certifications)

    # ACHIEVEMENTS
    achievements = resume_content.get("achievements", [])

    if achievements:
        add_section("Achievements")
        add_bullets(achievements)

    # BUILD PDF
    document.build(story)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes
