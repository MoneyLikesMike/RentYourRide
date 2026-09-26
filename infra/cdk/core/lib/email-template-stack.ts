import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EmailTemplates } from "./constructs/email-templates/email-templates";

export interface EmailTemplateStackProps extends StackProps {

}

export class EmailTemplateStack extends Stack {
    constructor(scope: Construct, id: string, props: EmailTemplateStackProps) {
        super(scope, id, props);
        new EmailTemplates(this, 'RYREmailTemplates', {});

    }
}