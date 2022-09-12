from abc import ABC, abstractclassmethod
from typing import Dict, Any


class BaseYamlRepository(ABC):
    @abstractclassmethod
    def load(self, yaml_file: str) -> Dict[str, Any]:
        pass
    
    
    @abstractclassmethod
    def save(self, yaml_file: str, yaml_dict: Dict[str, Any]) -> None:
        pass
