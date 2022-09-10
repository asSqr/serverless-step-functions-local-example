<div align="center">

</div>

<h1 align="center">serverless-step-functions-local-example</h1>

<p align="center">Local emulation of AWS Step Functions with serverless framework</p>

This repository is the [serverless framework](https://github.com/serverless/serverless) plugin for local invocation of AWS Step Functions modifying the existing [serverless-step-functions-local](https://github.com/codetheweb/serverless-step-functions-local) plugin.

## Local invocation
- create an AWS profile (for example, `test-profile`) in `~/.aws/crendential`
- install `unbuffer` command
    ```bash
    $ brew install expect
    ```
- install aws sam cli
    ```bash
    $ brew tap aws/tap
    $ brew install aws-sam-cli
    ```
- install related package
    ```bash
    $ npm install stepfunctions-localhost
    ```
- package with serverless framework
    ```bash
    $ npx serverless package --aws-profile test-profile
    ```
- build SAM layer
    ```bash
    $ sam build --use-container MyLayer
    ```
- execute two commands below to invoke local Step Functions   
c.f. https://kazuhira-r.hatenablog.com/entry/2019/04/23/000355 (in Japanese)
  ```bash
  $ npx serverless stepf offline --aws-profile test-profile
  ```
  ```bash
  $ aws stepfunctions --endpoint http://localhost:8083 start-execution --state-machine arn:aws:states:ap-northeast-1:012345678901:stateMachine:StateMachine --name Lambda_local --input ""
  ```
- version
    ```bash
    $ sam --version
    > SAM CLI, version 1.36.0
    ```

    ```bash
    $ npx serverless --version
    > Framework Core: 2.69.1 (local)
    Plugin: 5.5.1
    SDK: 4.3.0
    Components: 3.18.1
    ```

- invoke a single Lambda function
    ```bash
    $ aws lambda invoke /dev/null \
    --endpoint-url http://localhost:4000 \
    --function-name LambdaFunction
    ```

- export SAM template
    ```bash
    $ npx serverless sam export --output ./template.yml
    ```
    Then, add the below snippet to `template.yml`:
    ```yaml
    Resources:
        MyLayer:
            Type: AWS::Serverless::LayerVersion
            Properties:
            Description: Layer description
            ContentUri: 'my_layer/'
            CompatibleRuntimes:
                - python3.8
            Metadata:
            BuildMethod: python3.8
    Outputs:
    LambdaFunction:
        Description: 'lambda-func'
        Value: !GetAtt LambdaFunction.Arn
    ```
    And add the below setting to each Lambda function:
    ```yaml
    Layers:
        - !Ref MyLayer
    ```
    c.f. https://qiita.com/hayao_k/items/f8c7ad5e35e29d590957 (in Japanese)

## Deployment
- execute the below command
  ```bash
  $ serverless deploy --aws-profile test-profile
  ```
