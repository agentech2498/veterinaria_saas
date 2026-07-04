import io
import urllib.request
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether
from reportlab.lib.units import cm
from PIL import Image
import logging

logger = logging.getLogger(__name__)
import tempfile
import base64
import os

from .dtos import ClinicData, VetIdentity, PatientData

class BaseDocumentBuilder:
    def __init__(self, clinic_data: ClinicData, vet_identity: VetIdentity, patient_data: PatientData):
        self.clinic_data = clinic_data
        self.vet_identity = vet_identity
        self.patient_data = patient_data
        self.buffer = io.BytesIO()
        
        # Margins: Left, Right, Top, Bottom
        self.doc = SimpleDocTemplate(
            self.buffer, 
            pagesize=A4, 
            rightMargin=2*cm, 
            leftMargin=2*cm, 
            topMargin=3*cm, 
            bottomMargin=3*cm
        )
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
        self.elements = []
        self.temp_files = [] # To clean up downloaded/decoded images
        
    def setup_custom_styles(self):
        self.styles.add(ParagraphStyle(
            name='TitleCentered',
            parent=self.styles['Heading1'],
            alignment=1, # Center
            spaceAfter=12,
            textColor=colors.HexColor("#0d9488") # Teal 600
        ))
        self.styles.add(ParagraphStyle(
            name='Subtitle',
            parent=self.styles['Heading3'],
            spaceAfter=6,
            textColor=colors.HexColor("#475569") # Slate 600
        ))
        self.styles.add(ParagraphStyle(
            name='PatientInfoLabel',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            textColor=colors.HexColor("#334155")
        ))
        self.styles.add(ParagraphStyle(
            name='PatientInfoValue',
            parent=self.styles['Normal'],
            textColor=colors.HexColor("#0f172a")
        ))
        
    def _create_temp_image(self, b64_or_url: str) -> str:
        """Helper to create a temporary image file from base64 or URL for ReportLab."""
        if not b64_or_url:
            return None
            
        try:
            fd, path = tempfile.mkstemp(suffix=".png")
            os.close(fd)
            self.temp_files.append(path)
            
            if b64_or_url.startswith('data:image'):
                header, encoded = b64_or_url.split(",", 1)
                data = base64.b64decode(encoded)
                with open(path, "wb") as f:
                    f.write(data)
            elif b64_or_url.startswith('http'):
                urllib.request.urlretrieve(b64_or_url, path)
            else:
                return None
            return path
        except Exception as e:
            logger.warning("Error loading image for PDF from '%s': %s", b64_or_url[:30], e)
            return None

    def _draw_header(self, canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica-Bold', 16)
        canvas.setFillColor(colors.HexColor("#0f172a"))
        
        # Clinic Name
        canvas.drawString(2*cm, A4[1] - 1.5*cm, self.clinic_data.name.upper())
        
        # Clinic Details
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(colors.HexColor("#64748b"))
        y_pos = A4[1] - 2*cm
        if self.clinic_data.address:
            canvas.drawString(2*cm, y_pos, self.clinic_data.address)
            y_pos -= 0.4*cm
        if self.clinic_data.phone:
            canvas.drawString(2*cm, y_pos, f"Tel: {self.clinic_data.phone}")
            
        # Draw Watermark
        canvas.setFont('Helvetica-Bold', 60)
        canvas.setFillColor(colors.black)
        canvas.setFillAlpha(0.03) # Transparency
        canvas.translate(A4[0]/2, A4[1]/2)
        canvas.rotate(45)
        canvas.drawCentredString(0, 0, self.clinic_data.name.upper())
        
        canvas.restoreState()
        
    def _draw_footer(self, canvas, doc):
        canvas.saveState()
        # Footer text
        canvas.setFont('Helvetica-Oblique', 8)
        canvas.setFillColor(colors.HexColor("#94a3b8"))
        timestamp = datetime.now().strftime("%d/%m/%Y %H:%M")
        footer_text = f"Documento generado el {timestamp} | Pág. {doc.page}"
        canvas.drawCentredString(A4[0]/2, 1.5*cm, footer_text)
        canvas.restoreState()

    def build_patient_info_block(self):
        """Creates a standardized table with the patient's information."""
        p = self.patient_data
        data = [
            [
                Paragraph("Paciente:", self.styles['PatientInfoLabel']), Paragraph(p.name, self.styles['PatientInfoValue']),
                Paragraph("Especie:", self.styles['PatientInfoLabel']), Paragraph(p.species, self.styles['PatientInfoValue'])
            ],
            [
                Paragraph("Raza:", self.styles['PatientInfoLabel']), Paragraph(p.breed or "-", self.styles['PatientInfoValue']),
                Paragraph("Sexo:", self.styles['PatientInfoLabel']), Paragraph(p.sex or "-", self.styles['PatientInfoValue'])
            ],
            [
                Paragraph("Nacimiento:", self.styles['PatientInfoLabel']), Paragraph(p.birth_date or "-", self.styles['PatientInfoValue']),
                Paragraph("Peso:", self.styles['PatientInfoLabel']), Paragraph(f"{p.weight} kg" if p.weight else "-", self.styles['PatientInfoValue'])
            ]
        ]
        
        if p.owner_name:
            data.append([
                Paragraph("Tutor:", self.styles['PatientInfoLabel']), Paragraph(p.owner_name, self.styles['PatientInfoValue']),
                "", ""
            ])
            
        table = Table(data, colWidths=[2.5*cm, 5.5*cm, 2.5*cm, 5.5*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        return table

    def build_signature_block(self):
        """Creates the signature and stamp block using VetIdentity data."""
        v = self.vet_identity
        
        sig_path = self._create_temp_image(v.signature_url)
        stamp_path = self._create_temp_image(v.stamp_url)
        
        sig_img = RLImage(sig_path, width=4*cm, height=2*cm, kind='proportional') if sig_path else Paragraph("_______________________", self.styles['Normal'])
        stamp_img = RLImage(stamp_path, width=3.5*cm, height=3.5*cm, kind='proportional') if stamp_path else ""
        
        # We put them in a table to align them properly
        data = [
            [sig_img, stamp_img],
            [Paragraph(f"<b>{v.name}</b><br/>{v.professional_title}<br/>Matrícula: {v.license_number or 'No especificada'}", self.styles['Normal']), ""]
        ]
        
        table = Table(data, colWidths=[8*cm, 8*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        
        return KeepTogether(table)

    def generate(self) -> bytes:
        """To be implemented by subclasses. Should populate self.elements and call doc.build."""
        raise NotImplementedError("Subclasses must implement generate()")
        
    def _cleanup(self):
        """Clean up temporary image files."""
        for path in self.temp_files:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                logger.warning("Failed to cleanup temp file %s: %s", path, e)
