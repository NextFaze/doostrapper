import {
  IBaseDeploymentProps,
  BaseDeployment,
} from '../internal-constructs/base-deployment';
import { IBackendEnvironment } from '../interfaces';
import { Construct } from '@aws-cdk/core';
import { CdkAppPipeline } from '../internal-constructs/cdk-app-pipeline';

/**
 * @inheritdoc {@link IBaseDeploymentProps}
 */
export interface IBackendDeploymentProps
  extends IBaseDeploymentProps<IBackendEnvironment> {}

/**
 * Create an automated continuos delivery/deployment pipeline to deploy serverless apps. <br />
 * It uses declarative buildspec syntax to configure deployment steps, powering you with highly
 * customization multi environment pipeline. <br />
 * Additionally, it also configures notification channels to report deployment notifications to your developers.
 */
export class BackendDeployment extends BaseDeployment {
  constructor(scope: Construct, id: string, props: IBackendDeploymentProps) {
    super(scope, id);

    const {
      pipelineConfig,
      notificationConfig: { notificationsTargetConfig },
    } = props;

    const pipelineConstruct = new CdkAppPipeline(this, 'MultiEnvPipeline', {
      ...pipelineConfig,
    });

    this.createNotificationSubscription(
      pipelineConstruct,
      notificationsTargetConfig
    );
  }
}
