import logging
import os
import uuid
import re
from typing import Tuple, Optional
from .base import StorageProvider

logger = logging.getLogger(__name__)

class DiskStorageProvider(StorageProvider):
    def __init__(self, allowed_mimes: list = None, max_size_mb: int = 5):
        self.base_path = os.environ.get("STORAGE_PATH", "./storage")
        self.base_path = os.path.abspath(self.base_path)
        os.makedirs(self.base_path, exist_ok=True)
        
        self.allowed_mimes = allowed_mimes or [
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "application/pdf"
        ]
        self.max_size_bytes = max_size_mb * 1024 * 1024

    def _is_safe_path(self, path: str) -> bool:
        # Prevents path traversal
        full_path = os.path.abspath(os.path.join(self.base_path, path))
        return full_path.startswith(self.base_path)
        
    def _sanitize_filename(self, filename: str) -> str:
        # Extract extension
        name, ext = os.path.splitext(filename)
        # Keep only alphanumeric and dashes/underscores for name
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '', name)
        return f"{safe_name}{ext}"

    def upload_file(self, file_bytes: bytes, path: str, content_type: str = "application/octet-stream") -> Tuple[Optional[str], Optional[str]]:
        if content_type not in self.allowed_mimes:
            logger.warning("upload_file: tipo de archivo no permitido '%s' para ruta '%s'", content_type, path)
            return None, f"Tipo de archivo no permitido: {content_type}"

        if len(file_bytes) > self.max_size_bytes:
            logger.warning("upload_file: archivo excede tamaño máximo (%d bytes) para ruta '%s'", len(file_bytes), path)
            return None, "El archivo excede el tamaño máximo permitido."

        if not self._is_safe_path(path):
            logger.warning("upload_file: path traversal detectado para ruta '%s'", path)
            return None, "Ruta de archivo inválida (Path Traversal detectado)."

        # Determine safe target path
        dirname, filename = os.path.split(path)
        safe_filename = self._sanitize_filename(filename)
        
        # If the caller didn't use a UUID, we enforce it to avoid overwrites
        # But if they already passed a UUID (like UUID.png), we keep it
        if len(safe_filename.split('.')[0]) < 32: 
            safe_filename = f"{uuid.uuid4().hex}_{safe_filename}"

        target_dir = os.path.join(self.base_path, dirname)
        os.makedirs(target_dir, exist_ok=True)
        
        target_path = os.path.join(target_dir, safe_filename)
        relative_path = os.path.join(dirname, safe_filename).replace("\\", "/")
        
        try:
            with open(target_path, "wb") as f:
                f.write(file_bytes)
            logger.debug("Archivo guardado: %s (%d bytes)", relative_path, len(file_bytes))
            return relative_path, None
        except Exception as e:
            logger.exception("Error al guardar archivo en disco: %s", target_path)
            return None, f"Error al guardar archivo en disco: {str(e)}"

    def get_public_url(self, path: str) -> Optional[str]:
        if not path:
            return None
        normalized_path = path.replace("\\", "/")
        base_url = os.environ.get("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
        return f"{base_url}/storage/{normalized_path}"

    def delete_file(self, path: str) -> Tuple[bool, Optional[str]]:
        if not path:
            return False, "Ruta vacía"
            
        # Si path viene con prefijo /storage/, lo limpiamos
        if path.startswith("/storage/"):
            path = path[len("/storage/"):]
            
        if not self._is_safe_path(path):
            return False, "Ruta de archivo inválida (Path Traversal detectado)."
            
        target_path = os.path.join(self.base_path, path)
        try:
            if os.path.exists(target_path):
                os.remove(target_path)
                logger.debug("Archivo eliminado: %s", path)
                return True, None
            logger.warning("delete_file: archivo no existe: %s", path)
            return False, "El archivo no existe"
        except Exception as e:
            logger.exception("Error al eliminar archivo: %s", target_path)
            return False, str(e)
