import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EmailTemplatesPart2 } from "./constructs/email-templates/email-templates-part-2";

export class EmailTemplatePart2Stack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);
        new EmailTemplatesPart2(this, 'RYREmailTemplatesPart2', {});

    }
}