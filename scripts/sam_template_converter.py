import yaml

RESOURCE_LAMBDA_LAYER_SETTINGS = {
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

OUTPUT_SETTINGS = {
    'ServerlessStepFunctionsExampleentrypoint': {
        'Description': 'serverless-step-functions-exampleentrypoint',
        'Value': '!GetAtt ServerlessStepFunctionsExampleentrypoint.Arn'
    },
    'ServerlessStepFunctionsExampleworker': {
        'Description': 'serverless-step-functions-exampleworker',
        'Value': '!GetAtt ServerlessStepFunctionsExampleworker.Arn'
    },
    'ServerlessStepFunctionsExampleaggregate': {
        'Description': 'serverless-step-functions-exampleaggregate',
        'Value': '!GetAtt ServerlessStepFunctionsExampleaggregate.Arn'
    }
}

TYPE_LAMBDA_FUNCTION = 'AWS::Serverless::Function'

with open('./template.yml') as file:
    obj = yaml.safe_load(file)
    
    for resource in obj['Resources']:
        if resource['Type'] == TYPE_LAMBDA_FUNCTION:
            resource['Properties']['Layers'] = ['!Ref LambdaLayer']
    
    obj['Resources'].update({
        **obj['Resources'],
        **RESOURCE_LAMBDA_LAYER_SETTINGS
    })
    
    obj['Outputs'] = OUTPUT_SETTINGS
    
with open('./template.yml', 'w') as file:
    yaml.safe_dump(obj, file)

with open('./template.yml', 'w') as file:
    file.read()