import logging
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether
from reportlab.lib import colors
from reportlab.lib.units import cm
from typing import List
from ..base import BaseDocumentBuilder
from ..dtos import VaccineData, ClinicData, VetIdentity, PatientData
import segno
import io

logger = logging.getLogger(__name__)

class PassportBuilder(BaseDocumentBuilder):
    def __init__(self, clinic_data: ClinicData, vet_identity: VetIdentity, patient_data: PatientData, vaccines: List[VaccineData], verification_url: str = None):
        super().__init__(clinic_data, vet_identity, patient_data)
        self.vaccines = vaccines
        self.verification_url = verification_url

    def _generate_qr(self):
        if not self.verification_url:
            return None
        qr = segno.make(self.verification_url)
        out = io.BytesIO()
        qr.save(out, kind='png', scale=4)
        out.seek(0)
        return RLImage(out, width=3*cm, height=3*cm)

    def generate(self) -> bytes:
        logger.debug("Generando PDF pasaporte: paciente='%s' vacunas=%d", self.patient_data.name, len(self.vaccines))
        try:
            self.elements.append(Paragraph("PASAPORTE DIGITAL VETERINARIO", self.styles['TitleCentered']))
            self.elements.append(Spacer(1, 0.5*cm))
            
            # Create a 2-column layout for the passport top section
            qr_img = self._generate_qr()
            
            left_col = [
                Paragraph(f"<b>Nombre:</b> {self.patient_data.name}", self.styles['Normal']),
                Paragraph(f"<b>Especie:</b> {self.patient_data.species}", self.styles['Normal']),
                Paragraph(f"<b>Raza:</b> {self.patient_data.breed or '-'}", self.styles['Normal']),
                Paragraph(f"<b>Sexo:</b> {self.patient_data.sex or '-'}", self.styles['Normal']),
                Paragraph(f"<b>Nacimiento:</b> {self.patient_data.birth_date or '-'}", self.styles['Normal']),
                Paragraph(f"<b>Tutor:</b> {self.patient_data.owner_name or '-'}", self.styles['Normal']),
            ]
            
            right_col = []
            if qr_img:
                right_col.extend([qr_img, Paragraph("Escanear para verificar", self.styles['Normal'])])
            else:
                right_col.append(Paragraph("Sin QR", self.styles['Normal']))
                
            top_table = Table([[left_col, right_col]], colWidths=[10*cm, 6*cm])
            top_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('ALIGN', (1,0), (1,0), 'CENTER'),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#0d9488")),
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0fdfa")),
                ('PADDING', (0,0), (-1,-1), 10),
            ]))
            
            self.elements.append(top_table)
            self.elements.append(Spacer(1, 1*cm))
            
            self.elements.append(Paragraph("Historial de Vacunación", self.styles['Subtitle']))
            self.elements.append(Spacer(1, 0.2*cm))
            
            if not self.vaccines:
                self.elements.append(Paragraph("Sin vacunas registradas.", self.styles['Normal']))
            else:
                data = [["Fecha", "Vacuna", "Lote"]]
                for v in self.vaccines:
                    data.append([
                        Paragraph(v.date, self.styles['Normal']),
                        Paragraph(v.vaccine_name, self.styles['Normal']),
                        Paragraph(v.batch_number or "-", self.styles['Normal']),
                    ])
                    
                table = Table(data, colWidths=[3*cm, 9*cm, 4*cm], repeatRows=1)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#475569")),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('ALIGN', (0,0), (-1,0), 'CENTER'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")),
                    ('BOX', (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")),
                ]))
                self.elements.append(table)
                
            self.elements.append(Spacer(1, 1.5*cm))
            self.elements.append(self.build_signature_block())
            
            self.doc.build(
                self.elements, 
                onFirstPage=self._draw_header, 
                onLaterPages=self._draw_header
            )
            return self.buffer.getvalue()
        finally:
            self._cleanup()
