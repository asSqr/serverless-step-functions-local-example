from typing import Dict, Any
from yaml import safe_load, safe_dump


class YamlRepository:
    def load_yaml(self, yaml_file: str) -> Dict[str, Any]:
        obj = {}
        
        with open(yaml_file) as file:
            obj = safe_load(file)
            
        return obj
    
    def save_yml(self, yaml_file: str, yaml_dict: Dict[str, Any]) -> None:
        with open(yaml_file, 'w') as file:
            safe_dump(yaml_dict, file)
