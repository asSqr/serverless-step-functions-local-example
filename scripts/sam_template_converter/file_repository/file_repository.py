from .base_file_repository import BaseFileRepository


class FileRepository(BaseFileRepository):
    def load(self, file_name: str) -> str:
        ret = ''
        
        with open(file_name) as file:
            ret = file.read()
            
        return ret
    
    
    def save(self, file_name: str, content: str) -> None:
        with open(file_name, 'w') as file:
            file.write(content)
