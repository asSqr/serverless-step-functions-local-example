<div align="center">

</div>

<h1 align="center">serverless-step-functions-local-example</h1>

<p align="center">Local emulation of AWS Step Functions with serverless framework</p>

This repository is the [serverless framework](https://github.com/serverless/serverless) example for local invocation of AWS Step Functions modifying the existing [serverless-step-functions-local](https://github.com/codetheweb/serverless-step-functions-local) plugin.

## Prerequisites and Installation
- create an AWS profile (for example, `test-profile`) in `~/.aws/crendential`
    ```bash
    [test-profile]
    aws_access_key_id=<Your AWS Access Key ID>
    aws_secret_access_key=<Your AWS Secret Access Key>
    ```
- install `unbuffer` command
    ```bash
    $ brew install expect
    ```
    type `unbuffer` command.
    ```
    $ unbuffer

    can't find package Expect
        while executing
    "package require Expect"
        (file "/opt/homebrew/bin/unbuffer" line 6)
    ```
    If the above error occurs, execute
    ```bash
    $ sudo vi /opt/homebrew/bin/unbuffer
    ```
    and replace
    ```bash
    # -*- tcl -*-
    # The next line is executed by /bin/sh, but not tcl \
    exec tclsh "$0" ${1+"$@"}
    
    package require Expect
    ```
    with
    ```bash
    #\
    exec expect "$0" ${1+"$@"}
    ```
- install aws-sam-cli
    ```bash
    $ brew tap aws/tap
    $ brew install aws-sam-cli
    ```
- install serverless framework
    ```bash
    $ npm install -g serverless
    ```
- install related package
    ```bash
    $ npm install stepfunctions-localhost serverless-pseudo-parameters serverless-dotenv-plugin serverless-step-functions serverless-step-functions-local serverless-sam
    ```
- version
    ```bash
    $ sam --version
    
    SAM CLI, version 1.56.1
    ```

    ```bash
    $ npx serverless --version
    
    Framework Core: 2.72.3 (local)
    Plugin: 5.5.4
    SDK: 4.3.2
    Components: 3.18.2
    ```

## Deployment
First, deploy with serverless framework.

- execute the below command
  ```bash
  $ npx serverless deploy --aws-profile test-profile
  ```

## Local invocation
- package with serverless framework
    ```bash
    $ npx serverless package --aws-profile test-profile
    ```
- export SAM template (if there is no template.yml)
    ```bash
    $ npx serverless sam export --output ./template.yml
    ```
    Then, add the below snippet to `template.yml`:
    ```yaml
    Resources:
        LambdaLayer:
            Type: AWS::Serverless::LayerVersion
            Properties:
                Description: Layer description
                ContentUri: 'lambda_layer/'
                CompatibleRuntimes:
                    - python3.8
        Metadata:
            BuildMethod: python3.8
    Outputs:
        ServerlessStepFunctionsExampleprodentrypoint:
            Description: 'serverless-step-functions-example-prod-entrypoint'
            Value: !GetAtt ServerlessStepFunctionsExampleprodentrypoint.Arn
        ServerlessStepFunctionsExampleprodworker:
            Description: 'serverless-step-functions-example-prod-worker'
            Value: !GetAtt ServerlessStepFunctionsExampleprodworker.Arn
        ServerlessStepFunctionsExampleprodaggregate:
            Description: 'serverless-step-functions-example-prod-aggregate'
            Value: !GetAtt ServerlessStepFunctionsExampleprodaggregate.Arn
    ```
    And add the below setting to each Lambda function:
    ```yaml
    Layers:
        - !Ref LambdaLayer
    ```
    c.f. https://qiita.com/hayao_k/items/f8c7ad5e35e29d590957 (in Japanese)
- build SAM layer
    ```bash
    $ sam build --use-container LambdaLayer
    ```
- execute two commands below on independent terminals to invoke local Step Functions   
c.f. https://kazuhira-r.hatenablog.com/entry/2019/04/23/000355 (in Japanese)
  ```bash
  $ npx serverless stepf offline --aws-profile test-profile
  ```
  ```bash
  $ aws stepfunctions --endpoint http://localhost:8083 start-execution --state-machine arn:aws:states:ap-northeast-1:012345678901:stateMachine:StateMachine --name Lambda_local --input ""
  ```
  ```
- invoke a single Lambda function
    ```bash
    $ aws lambda invoke /dev/null \
    --endpoint-url http://localhost:4000 \
    --function-name EntryPoint
    ```
