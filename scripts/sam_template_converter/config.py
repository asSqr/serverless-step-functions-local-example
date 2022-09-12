from glob import glob
import os
from typing import Dict, Any
from yaml_repository import BaseYamlRepository, YamlRepository
from utils import kebab_to_upper_camel_case


class Config:
    yaml_repo: BaseYamlRepository
    
    '''
    Resource Type of Lambda Function
    '''
    TYPE_LAMBDA_FUNCTION: str = 'AWS::Serverless::Function'

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
    Reference to Lambda layer
    '''
    REF_LAMBDA_LAYER: str = '!Ref LambdaLayer'

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
    OUTPUT_SETTINGS: Dict[str, Any] = {}
    
    '''
    SAM Template Yaml
    '''
    TEMPLATE_YAML_FILE_NAME: str = './template.yml'
    
    '''
    Serverless Config Yaml
    '''
    SERVERLESS_YAML_FILE_NAME: str = './serverless.yml'
    
    
    def __init__(self, yaml_repo: BaseYamlRepository):
        self.yaml_repo = yaml_repo
        self._generate_output_settings()
    
    
    def _generate_output_settings(self) -> None:
        service_name = self._get_service_name()
        
        for handler_folder in glob('./handler/**'):
            handler_name = os.path.basename(handler_folder)
            identifier = f'{service_name}{handler_name}'
            
            self.OUTPUT_SETTINGS[identifier] = {
                'Description': handler_name,
                'Value': f'!GetAtt {identifier}.Arn'
            }
    
    
    def _get_service_name(self) -> str:
        obj = self.yaml_repo.load(self.SERVERLESS_YAML_FILE_NAME)
        
        return kebab_to_upper_camel_case(obj['service'])
