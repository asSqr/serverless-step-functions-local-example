from typing import Dict, Any
from config import Config
from yaml_repository import BaseYamlRepository
from file_repository import BaseFileRepository

        
class Processor:
    config: Config
    yaml_repo: BaseYamlRepository
    file_repo: BaseFileRepository
    
    
    def __init__(self, config: Config, yaml_repo: BaseYamlRepository, file_repo: BaseFileRepository):
        self.config = config
        self.yaml_repo = yaml_repo
        self.file_repo = file_repo


    def process(self):
        yaml_file_name = self.config.TEMPLATE_YAML_FILE_NAME
        
        yaml_dict = self.yaml_repo.load(yaml_file_name)
        yaml_dict = self._convert(yaml_dict)
        self.yaml_repo.save(yaml_file_name, yaml_dict)
        
        yaml_content = self.file_repo.load(yaml_file_name)
        yaml_content = self._replace_with_yaml_invalid_str(yaml_content)
        self.file_repo.save(yaml_file_name, yaml_content)
        
        
    def _convert(self, yaml_dict: Dict[str, Any]) -> Dict[str, Any]:    
        for _, resource in yaml_dict['Resources'].items():
            if resource['Type'] == self.config.TYPE_LAMBDA_FUNCTION:
                resource['Properties']['Layers'] = [self.config.REF_LAMBDA_LAYER]
        
        yaml_dict['Resources'].update({
            **yaml_dict['Resources'],
            **self.config.RESOURCE_LAMBDA_LAYER_SETTINGS
        })
        
        yaml_dict['Outputs'] = self.config.OUTPUT_SETTINGS
        
        return yaml_dict


    def _replace_with_yaml_invalid_str(self, yaml_str: str) -> str:
        # '!GetAtt <Arn>' -> !GetAtt <Arn>
        for output_setting in self.config.OUTPUT_SETTINGS.values():    
            get_arn_command = output_setting['Value']
            
            yaml_str = yaml_str.replace(f"'{get_arn_command}'", get_arn_command)
            
        # '!Ref LambdaLayer' -> !Ref LambdaLayer
        ref_lambda_layer = self.config.REF_LAMBDA_LAYER
        yaml_str = yaml_str.replace(f"'{ref_lambda_layer}'", ref_lambda_layer)

        return yaml_str
