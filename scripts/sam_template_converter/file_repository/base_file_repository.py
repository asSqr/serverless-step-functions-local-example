from abc import ABC, abstractclassmethod


class BaseFileRepository(ABC):
    @abstractclassmethod
    def load(self, file_name: str) -> str:
        pass
    
    
    @abstractclassmethod
    def save(self, file_name: str, content: str) -> None:
        pass
