const path = require('path');
const StepFunctionsLocal = require('stepfunctions-localhost');
const AWS = require('aws-sdk');
const AWSSam = require('./aws-sam.js');
const tcpPortUsed = require('tcp-port-used');
const chalk = require('chalk');
const readLine = require('readline');
const BbPromise = require('bluebird');

class ServerlessStepFunctionsLocal {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.service = serverless.service;
    this.options = options;

    this.log = serverless.cli.log.bind(serverless.cli);
    this.config = (this.service.custom && this.service.custom.stepFunctionsLocal) || {};

    // Check config
    if (!this.config.accountId) {
      throw new Error('Step Functions Local: missing accountId');
    }

    if (!this.config.region) {
      throw new Error('Step Functions Local: missing region');
    }

    if (!this.config.lambdaEndpoint) {
      this.config.lambdaEndpoint = 'http://localhost:4000';
    }

    if (!this.config.path) {
      this.config.path = './.step-functions-local';
    }

    this.stepfunctionsServer = new StepFunctionsLocal(this.config);

    this.stepfunctionsAPI = new AWS.StepFunctions({ endpoint: 'http://localhost:8083', region: this.config.region });

    this.lambdaLocalServer = new AWSSam({});

    this.eventBridgeEventsEnabled = this.config.eventBridgeEvents && this.config.eventBridgeEvents.enabled;
    if (this.eventBridgeEventsEnabled) {
      this.eventBridgeAPI = new AWS.EventBridge({ endpoint: this.config.eventBridgeEvents.endpoint, region: this.config.region });
    }

    this.commands = {
        stepf: {
          // add start nested options
          commands: {
            offline: {
              lifecycleEvents: ['init', 'ready', 'end'],
              options: {},
              usage:
                'Simulates StepFunctions Server Offline',
            },
          },
          lifecycleEvents: [],
          options: {},
          usage: '',
        },
      }

    this.hooks = {
      'stepf:offline:init': async () => {
        await this.installStepFunctions();
        await this.startStepFunctions();
        await this.startLambdas();
        await this.getStepFunctionsFromConfig();
        await this.createEndpoints();
      },
      'stepf:offline:ready': async () => {
          await this.ready();
      },
      'before:stepf:offline:end': async () => {
        await this.stopStepFunctions();
      }
    };
  }

  installStepFunctions() {
    return this.stepfunctionsServer.install();
  }

  async startStepFunctions() {
    let serverStdout = this.stepfunctionsServer.start({
      account: this.config.accountId.toString(),
      lambdaEndpoint: this.config.lambdaEndpoint,
      region: this.config.region
    });

    readLine.createInterface({ input: serverStdout }).on('line', line => {
      console.log(chalk.blue('[Serverless Step Functions Local] (stepfunctions local)'), line.trim());

      if (this.eventBridgeEventsEnabled) {
        this.sendEventBridgeEvent(line.trim());
      }
    });

    // Wait for server to start
    await tcpPortUsed.waitUntilUsed(8083, 200, 10000);
  }

  async startLambdas() {
    const lambdaPort = this.config.lambdaEndpoint.split(':').pop();

    let serverStdout = this.lambdaLocalServer.start({
      account: this.config.accountId.toString(),
      port: lambdaPort,
      region: this.config.region
    });

    readLine.createInterface({ input: serverStdout }).on('line', line => {
        console.log(chalk.blue('[Serverless Step Functions Local] (aws-sam local start-lambda)'), line.trim());
      });

    // Wait for server to start
    await tcpPortUsed.waitUntilUsed(parseInt(lambdaPort), 200, 10000);
  }

  stopStepFunctions() {
    return this.stepfunctionsServer.stop();
  }

  async getStepFunctionsFromConfig() {
    const fromYamlFile = (serverlessYmlPath) =>
      this.serverless.yamlParser.parse(serverlessYmlPath);

    let parsed = {};
    let parser = null;

    if (!this.serverless.service.stepFunctions) {
      let { servicePath } = this.serverless.config;

      if (!servicePath) {
        throw new Error('service path not found');
      }
      const serviceFileName =
        this.options.config ||
        this.serverless.config.serverless.service.serviceFilename ||
        'serverless.yml';
      if (this.serverless.service.custom &&
        this.serverless.service.custom.stepFunctionsLocal &&
        this.serverless.service.custom.stepFunctionsLocal.location) {
        servicePath = this.serverless.service.custom.stepFunctionsLocal.location
      }
      const configPath = path.join(servicePath, serviceFileName);
      if (['.js', '.json', '.ts'].includes(path.extname(configPath))) {
        parser = this.loadFromRequiredFile;
      } else {
        parser = fromYamlFile;
      }
      await parser(configPath)
        .then(serverlessFileParam => this.serverless.variables.populateObject(serverlessFileParam)
        .then((parsedObject) => {
            this.serverless.service.stepFunctions = {
                validate: parsedObject.stepFunctions ? parsedObject.stepFunctions.validate : false,
                noOutput: parsedObject.stepFunctions ? parsedObject.stepFunctions.noOutput : false,
            };
            this.serverless.service.stepFunctions.stateMachines = parsedObject.stepFunctions
                && parsedObject.stepFunctions.stateMachines
                ? parsedObject.stepFunctions.stateMachines : {};
            this.serverless.service.stepFunctions.activities = parsedObject.stepFunctions
                && parsedObject.stepFunctions.activities
                ? parsedObject.stepFunctions.activities : [];

            if (!this.serverless.pluginManager.cliOptions.stage) {
                this.serverless.pluginManager.cliOptions.stage = this.options.stage
                || (this.serverless.service.provider && this.serverless.service.provider.stage)
                || 'dev';
            }

            if (!this.serverless.pluginManager.cliOptions.region) {
                this.serverless.pluginManager.cliOptions.region = this.options.region
                || (this.serverless.service.provider && this.serverless.service.provider.region)
                || 'us-east-1';
            }

            this.serverless.variables.populateService(this.serverless.pluginManager.cliOptions);
            return BbPromise.resolve();
        }));
    }
    
    parsed = this.serverless.service;

    this.stateMachines = parsed.stepFunctions.stateMachines;

    this.provider = this.serverless.getProvider('aws');

    const stackData = await this.provider
        .request(
            'CloudFormation',
            'describeStacks',
            { StackName: this.provider.naming.getStackName() },
            this.provider.getStage(),
            this.provider.getRegion()
        );

    const SERVERLESS_LAMBDA_FUNCTION_ARN_SUFFIX = 'QualifiedArn';

    const region = this.provider.getRegion();
    const accountId = this.service.custom.accountId;
    const serviceName = this.provider
        .naming
        .getStackName()
        .split('-')
        .slice(0, -1)
        .join('-');

    const resolveResource = (resource) => {
            const data = stackData.Stacks[0].Outputs
                .filter((output) => {
                    return output.OutputKey == resource + SERVERLESS_LAMBDA_FUNCTION_ARN_SUFFIX;
                })[0];

            const capitalizeHead = str => str.charAt(0).toUpperCase() + str.slice(1);

            const serviceNameCamel = serviceName
                .split('-')
                .map(capitalizeHead)
                .join('');

            // data.OutputValue example: arn:aws:lambda:ap-northeast-1:654766906481:function:serverless-step-functions-exampleprodaggregate:5
            // -> ServerlessStepFunctionsExampleprodaggregate
            return data.OutputValue
                .split(':')
                .slice(0, -1)
                .join(':')
                .replace(serviceName, serviceNameCamel)
                .split('-')
                .join('')
                .replace(region.split('-').join(''), 'us-west-2')
                .replace(''+accountId, '012345678901');

            // return `arn:aws:lambda:ap-northeast-1:123456789012:function:${resource.slice(0, -LAMBDA_FUNCTION.length)}`
        }

    for (let stateMachine of Object.keys(this.stateMachines)) {
        const definition = this.stateMachines[stateMachine].definition;

        function resolveArn(definition) {
            const states = definition.States;

            for (let state of Object.keys(states)) {
                let resource = states[state].Resource;

                if (states[state].Type == 'Map') {
                    resolveArn(states[state].Iterator);

                    continue;
                }

                if (!resource)
                    continue;

                const FN_GETATT = 'Fn::GetAtt';

                if (FN_GETATT in resource) {
                    const resourceName = resource[FN_GETATT][0];
                    const resourceArn = resolveResource(resourceName);

                   definition.States[state].Resource = resourceArn;
                }
            }

            return definition;
        };

        this.stateMachines[stateMachine].definition = resolveArn(definition);
    }

    if (parsed.custom &&
      parsed.custom.stepFunctionsLocal &&
      parsed.custom.stepFunctionsLocal.TaskResourceMapping
    ) {
      this.replaceTaskResourceMappings(
        parsed.stepFunctions.stateMachines,
        parsed.custom.stepFunctionsLocal.TaskResourceMapping
      );
    }
  }

  // This function must be ignored since mocking the require system is more
  // dangerous than beneficial
  loadFromRequiredFile(serverlessYmlPath) {
    /* istanbul ignore next */
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const fileContents = require(serverlessYmlPath);
    /* istanbul ignore next */
    return Promise.resolve(fileContents);
  }

  /**
   * Replaces Resource properties with values mapped in TaskResourceMapping
   */
  replaceTaskResourceMappings(input, replacements, parentKey) {
    for (const key in input) {
      if ({}.hasOwnProperty.call(input, key)) {
        const property = input[key];
        if (['object', 'array'].indexOf(typeof property) > -1) {
          if (input.Resource && replacements[parentKey]) {
            input.Resource = replacements[parentKey];
          }

          // Recursive replacement of nested states
          this.replaceTaskResourceMappings(property, replacements, key);
        }
      }
    }
  }

  async createEndpoints() {
    const endpoints = await Promise.all(Object.keys(this.stateMachines).map(stateMachineName => this.stepfunctionsAPI.createStateMachine({
      definition: JSON.stringify(this.stateMachines[stateMachineName].definition),
      name: stateMachineName,
      roleArn: `arn:aws:iam::${this.config.accountId}:role/DummyRole`
    }).promise()
    ));

    // Set environment variables with references to ARNs
    endpoints.forEach(endpoint => {
      process.env[`OFFLINE_STEP_FUNCTIONS_ARN_${endpoint.stateMachineArn.split(':')[6]}`] = endpoint.stateMachineArn;
    });
  }

  sendEventBridgeEvent(logLine) {
    let pattern = /(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{3}): (?<executionArn>.+) : (?<data>.+)/;
    let match = pattern.exec(logLine);

    if (match !== null) {
      let eventDate = Date.parse(match.groups.date);

      // Eg. arn:aws:states:us-east-1:101010101010:execution:state-machine-id:execution-id
      let eventExecutionArn = match.groups.executionArn;
      let eventExecutionName = eventExecutionArn.split(':').pop();
      let eventStatemachineArn = eventExecutionArn.replace(':execution:', ':stateMachine:').split(':').slice(0, -1).join(':');

      let eventData = JSON.parse(match.groups.data);

      let eventStatus;
      let eventStartDate = null;
      let eventStopDate = null;

      // https://docs.aws.amazon.com/step-functions/latest/dg/cw-events.html
      // https://docs.aws.amazon.com/step-functions/latest/apireference/API_HistoryEvent.html
      switch (eventData.Type) {
        case 'ExecutionAborted':
          eventStatus = "ABORTED";
          eventStopDate = eventDate;
          break;
        case 'ExecutionFailed':
          eventStatus = "FAILED";
          eventStopDate = eventDate;
          break;
        case 'ExecutionStarted':
          eventStatus = "RUNNING";
          eventStartDate = eventDate;
          break;
        case 'ExecutionSucceeded':
          eventStatus = "SUCCEEDED";
          eventStopDate = eventDate;
          break;
        case 'ExecutionTimedOut':
          eventStatus = "TIMED_OUT";
          eventStopDate = eventDate;
          break;
      }

      if (eventStatus !== undefined) {
        let params = {
          Entries: [
            {
              Detail: JSON.stringify({
                executionArn: eventExecutionArn,
                stateMachineArn: eventStatemachineArn,
                name: eventExecutionName,
                status: eventStatus,
                startDate: eventStartDate,
                stopDate: eventStopDate
              }),
              DetailType: 'Step Functions Execution Status Change',
              Resources: [eventExecutionArn],
              Source: 'aws.states',
              Time: eventDate
            }
          ]
        };

        this.eventBridgeAPI.putEvents(params, function(err, data) {
          if (err) {
            console.error(chalk.bgRed('[Serverless Step Functions Local]'), err, err.stack);
          }
        });
      }
    }
  }

  async ready() {
    if (process.env.NODE_ENV !== 'test') {
        await this._listenForTermination()
    }
  }

  async _listenForTermination() {
    const command = await new Promise((resolve) => {
      process
        // SIGINT will be usually sent when user presses ctrl+c
        .on('SIGINT', () => resolve('SIGINT'))
        // SIGTERM is a default termination signal in many cases,
        // for example when "killing" a subprocess spawned in node
        // with child_process methods
        .on('SIGTERM', () => resolve('SIGTERM'))
    })

    this.log(`Got ${command} signal. Offline Halting...`)
  }
}

module.exports = ServerlessStepFunctionsLocal;
