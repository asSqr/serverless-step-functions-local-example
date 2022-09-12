from typing import Dict, Any
from yaml import safe_load, safe_dump
from .base_yaml_repository import BaseYamlRepository


class YamlRepository(BaseYamlRepository):
    def load(self, yaml_file_name: str) -> Dict[str, Any]:
        obj = {}
        
        with open(yaml_file_name) as file:
            obj = safe_load(file)
            
        return obj
    
    
    def save(self, yaml_file_name: str, yaml_dict: Dict[str, Any]) -> None:
        with open(yaml_file_name, 'w') as file:
            safe_dump(yaml_dict, file)
