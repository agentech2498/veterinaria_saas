from src.core.storage import DiskStorageProvider, StorageProvider

# Instanciar el proveedor de almacenamiento por defecto
# En el futuro, se puede leer una variable de entorno como STORAGE_DRIVER 
# para elegir entre DiskStorageProvider, S3StorageProvider, etc.
storage_service: StorageProvider = DiskStorageProvider()
