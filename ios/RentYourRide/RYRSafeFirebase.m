#import <Foundation/Foundation.h>
#import <FirebaseCore/FirebaseCore.h>
#import <FirebaseAnalytics/FirebaseAnalytics.h>

/// Wraps FirebaseApp.configure in an ObjC @try/@catch so NSExceptions cannot abort launch.
void RYRSafeFirebaseConfigure(void) {
  @try {
    if ([FIRApp defaultApp] != nil) {
      return;
    }
    NSString *path = [[NSBundle mainBundle] pathForResource:@"GoogleService-Info" ofType:@"plist"];
    if (path.length == 0) {
      return;
    }
    [FIRApp configure];
    [FIRAnalytics setAnalyticsCollectionEnabled:YES];
    [FIRAnalytics logEventWithName:kFIREventAppOpen parameters:nil];
  } @catch (NSException *exception) {
    NSLog(@"[Firebase] configure skipped: %@ — %@", exception.name, exception.reason);
  }
}
