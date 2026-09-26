import { CfnEmailTemplate } from "aws-cdk-lib/aws-pinpoint";
import { Construct } from "constructs";
import * as TemplateConstants from './template-constants';
import { Template } from "aws-cdk-lib/assertions";

export interface EmailTemplatesProps{}


export class EmailTemplatesPart2 extends Construct {
    constructor(scope: Construct, id: string, props: EmailTemplatesProps){
        super(scope, id);


        const templates = [
         
            //
            {
              name: 'BookingRequestConfirmedGuest',
              subject: 'You Have Confirmed Booking Request ✅',
              htmlPart: TemplateConstants.BookingRequestConfirmedGuest,
              textPart: 'Your booking request has been approved.',
            },
            {
              name: 'ConfirmedBookingRequestHost',
              subject: '{{Host.FirstName}} Confirmed Your Booking Request ✅ ',
              htmlPart: TemplateConstants.ConfirmedBookingRequestHost,
              textPart: 'Your booking request has been approved.',
            },
            //
            {
              name: 'YourBookingRequestWasDenied',
              subject: 'Your Booking Request Was Denied ⛔',
              htmlPart: TemplateConstants.YourBookingRequestWasDenied,
              textPart: 'Your booking request has been denied.',
            },
            {
              name: 'YouDeniedABookingRequest',
              subject: 'You Denied A Booking Request ⛔',
              htmlPart: TemplateConstants.YouDeniedABookingRequest,
              textPart: 'Your booking request has been denied.',
            },
            //
            {
              name: 'Welcome',
              subject: 'Welcome To Rent Your Ride!',
              htmlPart: TemplateConstants.Welcome,
              textPart: 'Welcome To Rent Your Ride!',
            },
            //            
            {
              name: 'LicenseApproved',
              subject: 'We Approved Your License! ✅',
              htmlPart: TemplateConstants.LicenseApproved,
              textPart: 'Your license has been approved.',
            },
            //
            {
              name: 'LicenseDenied',
              subject: 'Your License Was Denied! ⛔',
              htmlPart: TemplateConstants.LicenseDenied,
              textPart: 'Your license has been denied.',
            },
            //
        

            {
              name: 'ListingApproved',
              subject: 'We Approved Your Listing! ✅',
              htmlPart: TemplateConstants.ListingApproved,
              textPart: 'Your listing has been approved.',
            },
            //
            {
              name: 'ListingDenied',
              subject: 'Your Listing Was Denied! ⛔',
              htmlPart: TemplateConstants.ListingDenied,
              textPart: 'Your listing has been denied.',
            },
            //
            {
              name: 'NewMessageFromHost',
              subject: 'New Message from {{Host.FirstName}}',
              htmlPart: TemplateConstants.NewMessageFromHost,
              textPart: 'You have a new message from your host.',
            },
            //
            {
              name: 'NewMessageFromRenter',
              subject: 'New Message from {{Renter.FirstName}}',
              htmlPart: TemplateConstants.NewMessageFromGuest,
              textPart: 'You have a new message from your renter.',
            },
            //
            {
              name: 'AccountActivityNewPaymentMethod',
              subject: 'Account Activity: New Payment Method',
              htmlPart: TemplateConstants.AccountActivityNewPaymentMethod,
              textPart: 'A new payment method has been added to your account.',
            },
            //
            {
              name: 'YourTripIsBeginningSoonGuest',
              subject: 'Your Trip with {{Host.FirstName}} is Beginning Soon 👀',
              htmlPart: TemplateConstants.YourTripIsBeginningSoonGuest,
              textPart: 'Your trip is beginning soon. Get ready!',
            },
            {
              name: 'TripBeginningSoonHost',
              subject: 'Your Trip with {{Renter.FirstName}} is Beginning Soon 👀',
              htmlPart: TemplateConstants.TripBeginningSoonHost,
              textPart: 'Your trip is beginning soon. Get ready!',
            },
            //
            {
              name: 'YourTripIsEndingSoonGuest',
              subject: 'Your Trip with {{Host.FirstName}} is Ending Soon 👀',
              htmlPart: TemplateConstants.YourTripIsEndingSoonGuest,
              textPart: 'Your trip is ending soon. Don\'t forget to check out!',
            },
            {
              name: 'YourTripIsEndingSoonHost',
              subject: 'Your Trip with {{Renter.FirstName}} is Ending Soon 👀',
              htmlPart: TemplateConstants.YourTripIsEndingSoonHost,
              textPart: 'Your trip is ending soon. Don\'t forget to check out!',
            },
            {
              name: 'YourTripExtensionRequestWasDenied',
              subject: 'Your Trip Extension Request Was Denied ⛔',
              htmlPart: TemplateConstants.YourTripExtensionRequestWasDenied,
              textPart: 'Your trip extension request doesn\'t work for the host.',
            },
            {
              name: 'YouHaveDeniedATripExtenison',
              subject: 'You Denied A Trip Extension Request ⛔',
              htmlPart: TemplateConstants.YouHaveDeniedATripExtenison,
              textPart: 'You denied a trip extension request.',
            },
//
            {
              name: 'VerifyEmail',
              subject: 'Please Verify Your Email 📩',
              htmlPart: TemplateConstants.VerifyEmail,
              textPart: 'Click here to verify your email: {{Auth.EmailVerificationLink}}',
            },
            {
              name: 'PasswordRecovery',
              subject: 'Password Recovery Verification',
              htmlPart: TemplateConstants.PasswordRecovery,
              textPart: 'Click here to verify your password recovery: {{Auth.PasswordRecoveryLink}}',
            },
          ];
      
          // Create each email template
          for (const template of templates) {
            new CfnEmailTemplate(this, template.name, {
              templateName: template.name,
              subject: template.subject,
              htmlPart: template.htmlPart.toString('utf8'),
              textPart: template.textPart,
            });
          }


        
    }
}