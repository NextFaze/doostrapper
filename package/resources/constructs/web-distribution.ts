import { Construct } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { pascalCase } from 'change-case';
import {
  OriginAccessIdentity,
  CloudFrontWebDistribution,
  ViewerProtocolPolicy,
  ViewerCertificate,
  SecurityPolicyProtocol,
  SSLMethod,
  PriceClass,
} from '@aws-cdk/aws-cloudfront';
import { CnameRecord, IHostedZone } from '@aws-cdk/aws-route53';
import { DOMAIN_NAME_REGISTRAR } from '../constants/enums';
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';

interface IWebDistributionProps {
  aliases: string[];
  hostedZone: IHostedZone;
  certificate: DnsValidatedCertificate;
  domainNameRegistrar?: DOMAIN_NAME_REGISTRAR;
  defaultRootObject?: string;
  errorRootObject?: string;
  cloudfrontPriceClass?: PriceClass;
}

export class WebDistribution extends Construct {
  public readonly s3BucketSource: Bucket;
  constructor(scope: Construct, id: string, props: IWebDistributionProps) {
    super(scope, id);

    const {
      aliases,
      cloudfrontPriceClass,
      defaultRootObject,
      errorRootObject,
      domainNameRegistrar,
      hostedZone,
      certificate,
    } = props;

    this.s3BucketSource = new Bucket(this, 'OriginBucket');
    const originAccessIdentity = new OriginAccessIdentity(
      this,
      'OriginAccessIdentity',
      {
        comment: `Origin Access Identity for ${aliases[0]}`,
      }
    );

    const distribution = new CloudFrontWebDistribution(
      this,
      'CloudFrontWebDistribution',
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: this.s3BucketSource,
              originAccessIdentity,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
                forwardedValues: {
                  queryString: true,
                  cookies: {
                    forward: 'none',
                  },
                },
              },
            ],
          },
        ],

        defaultRootObject: defaultRootObject || 'index.html',
        errorConfigurations: [
          // we let out apps handle error redirection
          {
            errorCode: 200,
            responsePagePath: errorRootObject || 'index.html',
          },
        ],
        comment: `Cloudfront Distribution for ${aliases[0]}`,
        priceClass: cloudfrontPriceClass,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        viewerCertificate: ViewerCertificate.fromAcmCertificate(certificate, {
          securityPolicy: SecurityPolicyProtocol.TLS_V1_2_2018,
          sslMethod: SSLMethod.SNI,
          aliases: aliases,
        }),
      }
    );

    // register record in route53
    if (domainNameRegistrar === DOMAIN_NAME_REGISTRAR.AWS) {
      aliases.forEach(alias => {
        new CnameRecord(this, pascalCase(`${alias}CnameRecord`), {
          zone: hostedZone,
          recordName: alias,
          domainName: distribution.domainName,
        });
      });
    }
  }
}
