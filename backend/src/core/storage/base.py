import logging
from abc import ABC, abstractmethod
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


class StorageProvider(ABC):
    """
    Interfaz abstracta para los proveedores de almacenamiento (Storage).
    Soporta múltiples implementaciones: Local (Disk), Supabase, AWS S3, MinIO, etc.
    """

    @abstractmethod
    def upload_file(self, file_bytes: bytes, path: str, content_type: str = "application/octet-stream") -> Tuple[Optional[str], Optional[str]]:
        """
        Sube un archivo al almacenamiento.
        Retorna (resultado_operacion, mensaje_de_error).
        Si el error es None, la operación fue exitosa.
        """
        pass

    @abstractmethod
    def get_public_url(self, path: str) -> Optional[str]:
        """
        Devuelve la URL pública para acceder al archivo.
        """
        pass
    
    @abstractmethod
    def delete_file(self, path: str) -> Tuple[bool, Optional[str]]:
        """
        Elimina un archivo del almacenamiento.
        Retorna (exito, mensaje_de_error).
        """
        pass
