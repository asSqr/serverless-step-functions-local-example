from typing import Dict, Any
from .config import Config
from .yaml_repository import YamlRepository

        
class Processor:
    config: Config
    yaml_repo: YamlRepository
    
    def __init__(self, config: Config, yaml_repo: YamlRepository):
        self.config = config
        self.yaml_repo = yaml_repo
        
    def process(self):
        yaml_dict = self.yaml_repo.load_yaml(self.config.TEMPLATE_YAML_FILE_NAME)
        yaml_dict = self.convert(yaml_dict)
        self.yaml_repo.save_yml(yaml_dict)
        
    def convert(self, yaml_dict: Dict[str, Any]) -> Dict[str, Any]:    
        for resource in yaml_dict['Resources']:
            if resource['Type'] == self.config.TYPE_LAMBDA_FUNCTION:
                resource['Properties']['Layers'] = ['!Ref LambdaLayer']
        
        yaml_dict['Resources'].update({
            **yaml_dict['Resources'],
            **self.config.RESOURCE_LAMBDA_LAYER_SETTINGS
        })
        
        yaml_dict['Outputs'] = self.config.OUTPUT_SETTINGS
        
        return yaml_dict

    def replace_invalid_str(self, yaml_str: str) -> str:
        pass
