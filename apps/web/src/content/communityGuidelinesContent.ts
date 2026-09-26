/** Same host/guest guideline copy as the mobile app (`content/communityGuidelines.js`). */
export type GuidelineSection =
  | { type: 'title'; text: string }
  | { type: 'body'; text: string }
  | { type: 'bullet'; lead: string; rest: string }
  | { type: 'item'; text: string }
  | { type: 'emphasis'; text: string };

export const HOST_GUIDELINE_SECTIONS: GuidelineSection[] = [
  { type: 'title', text: 'Rent Your Ride Host Guideline' },
  {
    type: 'body',
    text: 'Rent Your Ride wants to create the best rental experience for both owner and renter. Here are some tips we have created to help improve your satisfaction on our platform.',
  },
  { type: 'title', text: 'Tips' },
  {
    type: 'body',
    text: 'Honesty is the best policy. Whether it is being clear about the condition of your vehicle or the availability. Being honest in advance prevents all sorts of unwanted problems after the trip has occurred.',
  },
  {
    type: 'body',
    text: 'Punctuality in time is also something which Rent Your Ride promotes. We understand that both the hosts and the guests of the platform may have busy conflicting schedules. By respecting the booked time and date selected by guests, it provides for a trouble free environment and allows your bookings to go smoothly. We advise that all users check their user dashboard regularly, especially if you have your vehicle(s) listed on Rent Your Ride. Frequent visits will ensure you not missing possible leads and inquires from potential users.',
  },
  { type: 'title', text: 'Hospitality' },
  {
    type: 'body',
    text: 'As a host on Rent Your Ride you are running your own business with our assistance. This means that you should provide the great service that you would want to reflect on your business. Here are some things we recommend to help you become the best host you can be:',
  },
  { type: 'bullet', lead: 'Respond', rest: ' to guests quickly' },
  {
    type: 'bullet',
    lead: 'Avoid cancellations.',
    rest: ' Cancelations do cause inconveniences for guest plans',
  },
  {
    type: 'bullet',
    lead: 'Accept trips.',
    rest: ' Accepting trips will make bring you more guests in the end. The more trips you have the more money you earn.',
  },
  {
    type: 'bullet',
    lead: 'Get those 5 star reviews.',
    rest: ' Follow the golden rule and become a golden host. Treat others how you would want to be treated and provide the service that you would want to provide. The more 5 star reviews you have the more guests you will attract and ultimately the more money you will make.',
  },
  {
    type: 'bullet',
    lead: 'Include adequate mileage.',
    rest: ' The more mileage you include the better. This will attract more guests and make their experience more enjoyable knowing they can travel where they need to go.',
  },
  {
    type: 'bullet',
    lead: 'Offer delivery.',
    rest: ' Can you imagine how nice it would be if you rented a car and had it delivered right to you. Your guests can! Offer a delivery option to make your guests trip as convenient as possible. More convenient than your average rental company.',
  },
  {
    type: 'bullet',
    lead: 'Offer extras.',
    rest: ' Offering extras like pre-paid fuel, or cleaning will make the experience more convenient for your guests.',
  },
  { type: 'title', text: 'Listing your vehicle' },
  {
    type: 'body',
    text: 'When listing your vehicles to our rapidly growing community, we suggest that you are detailed about the description and are sure to list all the options which your vehicle has. Many guests are looking for certain features such as Air Conditioning, Navigation, Sun Roof, and type of engine to list a few of the main ones. If your vehicle has any of these popular options be sure to include them in your description along with it being selected under the features available. Your description is your first impression and make sure you sell your product to its maximum potential to successful in the RYR community. Here are some things that we recommend to help your listing stand out:',
  },
  {
    type: 'bullet',
    lead: 'Use high quality photos.',
    rest: ' The photo of your vehicle is the first thing potential guests will see. Taking high quality photos will help attract potential guests to your listing. Make sure you take clear photos of the exterior and interior of the vehicle. To ensure that all of the key features and the true condition of your vehicle are represented to the Rent Your Ride community, we promote the use of professional photographers or using high resolution photographs to upload onto your listing.',
  },
  {
    type: 'bullet',
    lead: 'Make your price irresistible.',
    rest: ' Set your pricing so that no one can pass up on your amazing deal. If you are unsure of what to list your vehicle at check the other listings to see if there is anything similar to yours and base it off of that. If you are new, the lower the pricing the more guests you will attract which translates to more booked trips and more earnings for you.',
  },
  {
    type: 'bullet',
    lead: 'Be descriptive.',
    rest: ' The more the merrier, make it easy for guests and describe how awesome your car is with all the great features it has to offer. Set your expectations in your listing as well and include any rules you have for the operation of your vehicle. Add any FAQ or additional rules for checking in as well to make it as clear and easy as possible for guests who would like to rent your vehicle.',
  },
  { type: 'title', text: 'Maintaining your vehicle' },
  {
    type: 'body',
    text: 'We all know that everyone cares about their vehicle, yet we would like to remind you that the maintenance of your vehicle is what will provide for high rated reviews and frequent trips being booked. Make sure your vehicle is up to your local government safety regulations to ensure the safety of your guests. If a guest reports your vehicle as unsafe we will require documentation confirming that your vehicle has been inspected and passed your local government safety inspection.',
  },
  { type: 'title', text: 'Managing your trips' },
  {
    type: 'body',
    text: 'Keep yourself up to date with your trips. View any trip requests under “Rental Requests”. This section will show you any requests you have to rent your vehicle including your potential earnings with the date and times the guest would like to rent the vehicle. You can also message the guest and view their profile as well. Your current trips can be found under “Active Rentals”. This section will show you any current rentals that are in progress. Before your trip begins make sure you create the best experience possible for your guest. Here are some recommendations we have for you:',
  },
  {
    type: 'bullet',
    lead: 'Clean your car.',
    rest: ' You can’t go wrong with providing a clean car. A clean car can only add to the guests experience. Make sure you give yourself enough time between bookings to do this.',
  },
  {
    type: 'bullet',
    lead: 'Fill the tank.',
    rest: ' Provide your guests with a full tank of gas so they can get where they need to go with no interruptions. They will return it with a full tank as well!',
  },
  {
    type: 'bullet',
    lead: 'Turn on your notifications.',
    rest: ' Make sure your text, email and push notifications are on. You don’t want to miss out on any opportunities and you want to make sure you can respond to your guests quickly.',
  },
  {
    type: 'bullet',
    lead: 'Message ahead of time.',
    rest: ' Staying organized and messaging your guests ahead of time will make the trip process flawless. This gives guests ample time to ask any questions before the trip begins so that there is nothing left to do other than handing over the keys.',
  },
  {
    type: 'bullet',
    lead: 'Make your instructions clear.',
    rest: ' Make your pick up and drop off instructions clear. This will make it a lot easier for you and the guests!',
  },
  {
    type: 'bullet',
    lead: 'Following up.',
    rest: ' Follow up with your guests. Ask them if there is anything you can do for them or if they have any questions. This will help you get that 5 star review!',
  },
  { type: 'title', text: 'Pick up and drop off' },
  {
    type: 'body',
    text: 'On the pick-up or drop-off date, here are a few things to remember,',
  },
  {
    type: 'body',
    text: '1. Be on time and confirm the location of the meeting point both for the delivery and drop off.',
  },
  {
    type: 'body',
    text: '2. Have the appropriate Rental Acknowledgement paper work for the guest to sign before driving away.',
  },
  {
    type: 'body',
    text: '3. Walk around the vehicle with the guest to look over the condition and mark the rental acknowledgment form accordingly, be sure to do this once again when the car is dropped off.',
  },
  {
    type: 'body',
    text: '4. Take a picture of the odometer to note the kilometres exactly before the car is delivered and after the car is dropped off.',
  },
  {
    type: 'body',
    text: '5. Ask the guest if they have any questions on how to use the features in your vehicle.',
  },
  {
    type: 'body',
    text: '6. SHAKE HANDS, promote the friendly environment which Rent Your Ride strives to offer.',
  },
];

export const GUEST_GUIDELINE_SECTIONS: GuidelineSection[] = [
  { type: 'title', text: 'Rent Your Ride Guest Guideline' },
  {
    type: 'body',
    text: 'Rent Your Ride wants to create the best rental experience for both owner and renter. Here are some tips we have created to help improve your satisfaction on our platform.',
  },
  { type: 'title', text: 'Tips' },
  {
    type: 'body',
    text: 'Honesty is the best policy. Whether it is being clear about the condition of your vehicle or the availability. Being honest in advance prevents all sorts of unwanted problems after the trip has occurred.',
  },
  {
    type: 'body',
    text: 'Punctuality in time is also something which Rent Your Ride promotes. We understand that both the hosts and the guests of the platform may have busy conflicting schedules. By respecting the booked time and date for a trip, it provides for a trouble free environment and allows your bookings to go smoothly. We advise that all users check their user dashboard regularly, especially if you have your vehicle(s) listed on Rent Your Ride. Frequent visits will ensure you are not missing any messages or notifications.',
  },
  { type: 'title', text: 'Sign up' },
  {
    type: 'body',
    text: "We like to think of our platform as a way to build relationships between people and create a safe trusted community. By joining Rent Your Ride you're a joining a safe trusted community. When signing up with Rent Your Ride you are required to fill out the following:",
  },
  { type: 'item', text: '• First Name' },
  { type: 'item', text: '• Last Name' },
  { type: 'item', text: '• Email Address' },
  { type: 'item', text: '• Create a password' },
  { type: 'item', text: '• Address Line' },
  { type: 'item', text: '• City' },
  { type: 'item', text: '• Province' },
  { type: 'item', text: '• Country' },
  { type: 'item', text: '• Postal Code' },
  { type: 'item', text: '• Phone number' },
  { type: 'item', text: '• Profile picture' },
  { type: 'item', text: '• Bio' },
  {
    type: 'body',
    text: 'After you have signed up before you pick your ride make sure you add your license and add a form of payment. You will not be able to rent any vehicles until your license has been validated and a form of payment has been added.',
  },
  { type: 'title', text: 'Picking your ride' },
  {
    type: 'body',
    text: 'We have provided you a place to rent a diverse selection of vehicles from owners. We have created a low cost, short term opportunity for you to drive your dream vehicle. Rent Your Ride provides a convenient method to charter a vehicle that suits your individual needs and style, and get you where you need to go. Experience Rent Your Ride by searching available listings under “Find Your Ride”. You are able to filter your search with the following:',
  },
  { type: 'item', text: '• Vehicle type' },
  { type: 'item', text: '• Colour' },
  { type: 'item', text: '• Transmission type' },
  { type: 'item', text: '• Fuel type' },
  { type: 'title', text: 'Booking your trip' },
  {
    type: 'body',
    text: 'Rent Your Ride gives you the ability to instantly book a vehicle as long as its available. A notification will be sent to the owner via email and through the app on their dashboard. The host has up to eight hours to accept or reject your requests. If the owner accepts your request you will pre-pay for the trip. The payment will not be taken out until the day of the trip.',
  },
  {
    type: 'body',
    text: 'Booking the right vehicle for your trip should look like the following:',
  },
  {
    type: 'bullet',
    lead: 'Trip dates.',
    rest: ' Choose your trip start date/time and end date/time. The trip cost will change according to your trip length and will be shown to you before booking.',
  },
  {
    type: 'bullet',
    lead: 'Delivery.',
    rest: ' If the host offers delivery of their vehicle then you will be able to select “Drop off” which will add the additional drop off fee to your trip total.',
  },
  {
    type: 'bullet',
    lead: 'Discounts.',
    rest: ' If a host offers a discount on their vehicle you will see it in their listing and also during the checkout process.',
  },
  {
    type: 'bullet',
    lead: 'Total mileage included.',
    rest: ' Depending on the amount of days you booked the total mileage included will vary but it will be shown to you upon checkout. The additional fees per kilometre will also be shown to you in case you do go over the allotted mileage.',
  },
  { type: 'title', text: 'Pick up and drop off' },
  {
    type: 'body',
    text: 'On the pick-up or drop-off date, here are a few things to remember,',
  },
  {
    type: 'body',
    text: '1. Be on time and confirm the location of the meeting point both for the delivery and drop off.',
  },
  {
    type: 'body',
    text: '2. Bring your license and I.D. The Rent Your Ride host can’t release the vehicle to you if you don’t provide the necessary documentation.',
  },
  {
    type: 'body',
    text: '3. Walk around the vehicle with the host to look over the condition and mark the rental acknowledgment form accordingly, be sure to do this once again when the car is dropped off.',
  },
  {
    type: 'body',
    text: '4. Take a picture of the odometer to note the kilometres exactly before the car is delivered and after the car is dropped off. Take pictures of the condition as well so any claims can be supported by photo documentation.',
  },
  {
    type: 'body',
    text: '5. Ask the host if you have any questions on how to use the features in their vehicle.',
  },
  {
    type: 'body',
    text: '6. SHAKE HANDS, promote the friendly environment which Rent Your Ride strives to offer.',
  },
  {
    type: 'body',
    text: '7. Go online to write the review for the host when the trip is completed.',
  },
  { type: 'title', text: 'After the trip' },
  {
    type: 'body',
    text: 'After you have successfully completed the trip don’t forget to write a review! This helps keep our community transparent and allows others to see how great the host is!',
  },
  {
    type: 'bullet',
    lead: 'Reimbursement.',
    rest: ' You may get a request for reimbursement for any damages or tickets that happened during the trip. Please be ready to file the necessary documentation to support your claims if you plan on disputing the reimbursement.',
  },
  {
    type: 'emphasis',
    text: 'If you ever have any questions about anything reach out to our support team through our live chat or email us at support@rentyourride.ca. We also highly recommend you read our policies, FAQ, guides, and Term of Service before you start your trip.',
  },
];
