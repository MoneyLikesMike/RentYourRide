import { CfnEmailTemplate } from "aws-cdk-lib/aws-pinpoint";
import { Construct } from "constructs";
import * as TemplateConstants from './template-constants';
import { Template } from "aws-cdk-lib/assertions";

export interface EmailTemplatesProps{}


export class EmailTemplates extends Construct {
    constructor(scope: Construct, id: string, props: EmailTemplatesProps){
        super(scope, id);


        const templates = [
          {
            name: 'YourTripExtensionIsConfirmedGuest',
            subject: '{{Host.FirstName}} Confirmed Your Booking Request ✅',
            htmlPart: TemplateConstants.YourTripExtensionIsConfirmedGuest,
            textPart: 'Your booking extension has been approved.',
          },
            {
              name: 'YouConfirmedATripExtension',
              subject: 'You Have Confirmed A Trip Extension ✅',
              htmlPart: TemplateConstants.YouConfirmedATripExtension,
              textPart: 'Your booking extension has been approved.',
            },
            //
            {
              name: 'YouRequestedATripExtension',
              subject: 'You Sent A Trip Extension Request',
              htmlPart: TemplateConstants.YouRequestedATripExtension,
              textPart: 'Your booking extension has been created.',
            },
            {
              name: 'TripExtensionRequestHost',
              subject: '{{Renter.FirstName}} Would Like To Extend Their Trip With Your Ride 😊',
              htmlPart: TemplateConstants.TripExtensionRequestHost,
              textPart: 'Your booking extension has been created.',
            },
            //
            /*
                  'Host.FirstName':     [this.host.firstName],
      'Vehicle.Model':      [this.ride.model + ' ' + this.ride.make],
      'Vehicle.CoverImage': [this.handleRideCoverImage()],
      */
            {
              name: 'YoureCheckedInGuest',
              subject: "You're Checked In 😀",
              htmlPart: TemplateConstants.YoureCheckedInGuest,
              textPart: 'Reminder: Your check-in is coming up soon!',
            },
            /*
                  'Renter.FirstName': [this.renter.firstName],
      'Renter.LastName': [this.renter.lastName],
      'Renter.Avatar': [this.handleUserAvatar(this.renter)],*/
            {
              name: 'GuestHasCheckedInUsingYourRide',
              subject: '{{Renter.FirstName}} Has Checked In Using Your Ride👍',
              htmlPart: TemplateConstants.GuestHasCheckedInUsingYourRide,
              textPart: 'Reminder: Your check-in is coming up soon!',
            },
            //
            {
              name: 'YoureCheckedOutGuest',
              subject: "You're Checked Out 👋",
              htmlPart: TemplateConstants.YoureCheckedOutGuest,
              textPart: 'Reminder: Your check-out is coming up soon!',
            },
            {
              name: 'GuestCheckedOutOfYourRide',
              subject: '{{Renter.FirstName}} Has Checked Out',
              htmlPart: TemplateConstants.GuestCheckedOutOfYourRide,
              textPart: 'Reminder: Your check-out is coming up soon!',
            },
            //
            {
              name: 'WriteAReviewGuest',
              subject: 'Write A Review For {{Host.FirstName}}',
              htmlPart: TemplateConstants.WriteAReviewGuest,
              textPart: 'Don\'t forget to leave a review!',
            },
            {
              name: 'WriteAReviewForGuestName',
              subject: 'Write A Review For {{Renter.FirstName}}',
              htmlPart: TemplateConstants.WriteAReviewForGuestName,
              textPart: 'Don\'t forget to leave a review!',
            },
            //
            {
              name: 'CreateReviewByRenter',
              subject: 'Review Created by Renter',
              htmlPart: '<p>A new review has been created by the renter.</p>',
              textPart: 'A new review has been created by the renter.',
            },
            {
              name: 'CreateReviewByHost',
              subject: 'Review Created by Host',
              htmlPart: '<p>A new review has been created by the host.</p>',
              textPart: 'A new review has been created by the host.',
            },
            //
            {
              name: 'YouSentAReservationRequest',
              subject: 'You Sent A Booking Request',
              htmlPart: TemplateConstants.YouSentAReservationRequest,
              textPart: 'Your booking request has been created.',
            },
            {
              name: 'BookingRequest',
              subject: 'You Have A Booking Request 😊',
              htmlPart: TemplateConstants.BookingRequest,
              textPart: 'Your booking request has been created.',
            },
            //
     
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