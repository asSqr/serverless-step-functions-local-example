from glob import glob
import os
from typing import Dict, Any
from .yaml_repository import YamlRepository

class Config:
    '''
    Resource Type of Lambda Function
    '''
    TYPE_LAMBDA_FUNCTION = 'AWS::Serverless::Function'

    '''
    Settings of Lambda Layer
    '''
    RESOURCE_LAMBDA_LAYER_SETTINGS: Dict[str, Any] = {
        'LambdaLayer': {
            'Type': 'AWS::Serverless::LayerVersion',
            'Properties': {
                'Description': 'Layer description',
                'ContentUri': 'layer_requirements/',
                'CompatibleRuntimes': ['python3.8']
            },
            'Metadata': {
                'BuildMethod': 'python3.8'
            }
        }
    }

    '''
    Output Settings (auto-generated)
    
    Example:
        {
            'ServerlessStepFunctionsExampleentrypoint': {
                'Description': 'ServerlessStepFunctionsExampleentrypoint',
                'Value': '!GetAtt ServerlessStepFunctionsExampleentrypoint.Arn'
            },
            'ServerlessStepFunctionsExampleworker': {
                'Description': 'ServerlessStepFunctionsExampleworker',
                'Value': '!GetAtt ServerlessStepFunctionsExampleworker.Arn'
            },
            'ServerlessStepFunctionsExampleaggregate': {
                'Description': 'ServerlessStepFunctionsExampleaggregate',
                'Value': '!GetAtt ServerlessStepFunctionsExampleaggregate.Arn'
            }
        }
    '''
    OUTPUT_SETTINGS: Dict[str, Any]
    
    TEMPLATE_YAML_FILE_NAME: str = './template.yml'
    
    SERVERLESS_YAML_FILE_NAME: str = './serverless.yml'
    
    yaml_repo: YamlRepository
    
    def __init__(self, yaml_repo: YamlRepository):
        self.yaml_repo = yaml_repo
        self.generate_output_settings()
    
    def generate_output_settings(self) -> None:
        service_name = self._get_service_name()
        
        for handler_folder in glob('./handler/**'):
            handler_name = os.path.basename(handler_folder)
            identifier = f'{service_name}{handler_name}'
            
            self.OUTPUT_SETTINGS[identifier] = {
                'Description': identifier,
                'Value': f'!GetAtt {identifier}.Arn'
            }
    
    def _get_service_name(self) -> str:
        obj = self.yaml_repo.load_yaml(self.SERVERLESS_YAML_FILE_NAME)
        
        return self._kebab_to_upper_camel_case(obj['service'])
    
    def _kebab_to_upper_camel_case(self, kebab_str: str) -> str:
        def _capitalize_first_letter(input: str) -> str:
            return f'{input[0].capitalize()}input[1:]'
    
        return ''.join(
            list(
                map(kebab_str.split('-'), _capitalize_first_letter)
            )
        )
