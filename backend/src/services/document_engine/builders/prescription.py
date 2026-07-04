import logging
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from typing import List
from ..base import BaseDocumentBuilder
from ..dtos import PrescriptionData, ClinicData, VetIdentity, PatientData

logger = logging.getLogger(__name__)

class PrescriptionBuilder(BaseDocumentBuilder):
    def __init__(self, clinic_data: ClinicData, vet_identity: VetIdentity, patient_data: PatientData, prescription: PrescriptionData):
        super().__init__(clinic_data, vet_identity, patient_data)
        self.prescription = prescription

    def generate(self) -> bytes:
        logger.debug("Generando PDF receta médica: paciente='%s'", self.patient_data.name)
        try:
            self.elements.append(Paragraph("RECETA MÉDICA", self.styles['TitleCentered']))
            self.elements.append(Spacer(1, 0.5*cm))
            
            # Patient Info
            self.elements.append(self.build_patient_info_block())
            self.elements.append(Spacer(1, 1*cm))
            
            # Rp. (Recipe) symbol
            self.elements.append(Paragraph("<b>Rp.</b>", self.styles['Heading2']))
            self.elements.append(Spacer(1, 0.2*cm))
            
            # Medications
            self.elements.append(Paragraph(self.prescription.medications.replace('\n', '<br/>'), self.styles['Normal']))
            self.elements.append(Spacer(1, 1*cm))
            
            # Instructions
            self.elements.append(Paragraph("<b>Indicaciones:</b>", self.styles['Heading3']))
            self.elements.append(Spacer(1, 0.2*cm))
            self.elements.append(Paragraph(self.prescription.instructions.replace('\n', '<br/>'), self.styles['Normal']))
            
            self.elements.append(Spacer(1, 2.5*cm))
            self.elements.append(self.build_signature_block())
            
            self.doc.build(
                self.elements, 
                onFirstPage=self._draw_header, 
                onLaterPages=self._draw_header
            )
            return self.buffer.getvalue()
        finally:
            self._cleanup()
