import logging
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from typing import List
from ..base import BaseDocumentBuilder
from ..dtos import ClinicalRecordData, ClinicData, VetIdentity, PatientData

logger = logging.getLogger(__name__)

class ClinicalHistoryBuilder(BaseDocumentBuilder):
    def __init__(self, clinic_data: ClinicData, vet_identity: VetIdentity, patient_data: PatientData, records: List[ClinicalRecordData]):
        super().__init__(clinic_data, vet_identity, patient_data)
        self.records = records

    def generate(self) -> bytes:
        logger.debug("Generando PDF historial clínico: paciente='%s' registros=%d", self.patient_data.name, len(self.records))
        try:
            self.elements.append(Paragraph("HISTORIA CLÍNICA", self.styles['TitleCentered']))
            self.elements.append(Spacer(1, 0.5*cm))
            
            # Patient Info
            self.elements.append(self.build_patient_info_block())
            self.elements.append(Spacer(1, 1*cm))
            
            self.elements.append(Paragraph("Evolución Médica:", self.styles['Subtitle']))
            self.elements.append(Spacer(1, 0.2*cm))
            
            if not self.records:
                self.elements.append(Paragraph("No hay registros clínicos para este paciente.", self.styles['Normal']))
            else:
                data = [["Fecha", "Profesional", "Descripción"]]
                for r in self.records:
                    data.append([
                        Paragraph(r.date, self.styles['Normal']),
                        Paragraph(r.vet_name, self.styles['Normal']),
                        Paragraph(r.description, self.styles['Normal'])
                    ])
                    
                table = Table(data, colWidths=[3*cm, 4*cm, 9*cm], repeatRows=1)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0d9488")),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('ALIGN', (0,0), (-1,0), 'CENTER'),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")),
                    ('BOX', (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")),
                    ('PADDING', (0,0), (-1,-1), 6),
                ]))
                self.elements.append(table)
                
            self.elements.append(Spacer(1, 2*cm))
            self.elements.append(self.build_signature_block())
            
            self.doc.build(
                self.elements, 
                onFirstPage=self._draw_header, 
                onLaterPages=self._draw_header,
                canvasmaker=self.doc.canvasmaker
            )
            return self.buffer.getvalue()
        finally:
            self._cleanup()
