'use strict';

(function (angular, buildfire) {
  angular
    .module('customerFeedbackPluginWidget')
    .controller('WidgetSubmitCtrl', ['$scope','$location', '$rootScope', '$timeout', 'EVENTS', 'ViewStack',
      function ($scope, $location, $rootScope, $timeout, EVENTS, ViewStack) {

        var WidgetSubmit = this;
        let stringsKeys=[
          'leaveYourFeedback',
          'yourRating',
          'writeANote',
          'submitReviewButton',
          'dialogSave',
          'dialogCancel',
      ];
        WidgetSubmit.currentView = ViewStack.getCurrentView();
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        /* Initialize current logged in user as null. This field is re-initialized if user is already logged in or user login user auth api.
         */
        WidgetSubmit.disabled = true;
       // buildfire.history.push('Events', { elementToShow: 'Event' });
        WidgetSubmit.Feedback = {
          Message : "",
          starRating:"5",
          UserId:"",
          UserName: ""
        }
        WidgetSubmit.currentLoggedInUser = null;

        const getStrings = ()=>{
          stringsKeys.forEach((key)=>{
              buildfire.language.get({stringKey: 'addReview.' + key}, (err, result) => {
              if (err) return console.error("Error while retrieving string value", err);
              WidgetSubmit[key] = result;
              });
              
          });
        }

        getStrings();
        
        document.getElementById('submitReviewButton').value = WidgetSubmit.submitReviewButton || 'Submit';

        WidgetSubmit.initTextarea = function () {
          new mdc.textField.MDCTextField(
              document.querySelector('.required-review-textarea')
          );
          new mdc.textField.MDCTextField(
              document.querySelector('.review-textarea')
          );
        }
        /**
         * Method to open buildfire auth login pop up and allow user to login using credentials.
         */
        WidgetSubmit.openLogin = function () {
          buildfire.auth.login({}, function () {

          });
        };
        

         WidgetSubmit.showReviewDialog = function(){
          let textarea = document.getElementById('requiredReviewTextarea');
          buildfire.input.showTextDialog(
            {
              placeholder: WidgetSubmit.writeANote || 'Write a Review',
              saveText: WidgetSubmit.dialogSave || 'Save',
              cancelText: WidgetSubmit.dialogCancel || 'Cancel',
              defaultValue: textarea.value,
            },
            (err, response) => {
              if (err) return console.error(err);
              if (response.cancelled) return;
              textarea.value=response.results[0].textValue
              WidgetSubmit.Feedback.Message = response.results[0].textValue;
              if(response.results[0].textValue.trim() !== ''){
                WidgetSubmit.disabled = false;
                $scope.$apply();
              }else{
                WidgetSubmit.disabled = true;
                $scope.$apply();
                
              }
            }
          );
        }

        var loginCallback = function () {
          buildfire.auth.getCurrentUser(function (err, user) {
            console.log("_______________________", user);
            if (user) {
              $rootScope.$broadcast(EVENTS.LOGIN);
              WidgetSubmit.currentLoggedInUser = user;
              WidgetSubmit.initTextarea();
              $scope.$digest();
            }
          });
        };

        var logoutCallback = function () {
//            WidgetSubmit.openLogin();
            WidgetSubmit.currentLoggedInUser = null;
          ViewStack.popAllViews();
            $rootScope.$broadcast(EVENTS.LOGOUT);
          if (!$scope.$$phase)
            $scope.$digest();

        };

        WidgetSubmit.save = function () {
          // WidgetSubmit.disabled = true;
            if (WidgetSubmit.currentLoggedInUser) {
                //  $scope.complain.data.response = "";
                var objData = {starRating: WidgetSubmit.Feedback.starRating || 1, Message: WidgetSubmit.Feedback.Message, displayName: WidgetSubmit.currentLoggedInUser.displayName, addedDate: new Date(), userName: WidgetSubmit.currentLoggedInUser.username, userImage: WidgetSubmit.currentLoggedInUser.imageUrl }
                console.log("++++++++++++++", objData);
                if (WidgetSubmit.Feedback.Message) {
                    buildfire.userData.insert(objData, 'AppRatings2', function (err, data) {
                        if (err) console.error("+++++++++++++++err", JSON.stringify(err));
                        else {
                            data.userToken = WidgetSubmit.currentLoggedInUser._id;
                            console.log('>>>>>>>>>>>>>>>>>>>', data);
                            buildfire.messaging.sendMessageToControl({'name': EVENTS.REVIEW_CREATED, 'data': data, 'lastReviewCount': ((WidgetSubmit.currentView && WidgetSubmit.currentView.params && WidgetSubmit.currentView.params.lastReviewCount) || 0)});
                            $rootScope.$broadcast(EVENTS.REVIEW_CREATED, {'data': data, 'lastReviewCount': ((WidgetSubmit.currentView && WidgetSubmit.currentView.params && WidgetSubmit.currentView.params.lastReviewCount) || 0)});
//                      $location.path('/');
                          // WidgetSubmit.disabled = false;
                            $scope.$apply();
                            console.log("+++++++++++++++success");
                            $timeout(function () {
                                ViewStack.popAllViews();
                            }, 500);
                        }
                    });
                }
            } else {
                WidgetSubmit.openLogin();
            }
        }

          WidgetSubmit.cancel= function () {
              ViewStack.popAllViews();
          }

        //WidgetSubmit.update = function () {
        //  //  $scope.complain.data.response = "";
        //  var objData = {starRating:WidgetSubmit.Feedback.starRating, Message:WidgetSubmit.Feedback.Message, displayName: WidgetSubmit.currentLoggedInUser.displayName, addedDate: new Date(), userName:WidgetSubmit.currentLoggedInUser.username}
        //  console.log("++++++++++++++",objData)
        //  buildfire.userData.update(WidgetSubmit.updateId, objData, 'AppRatings2', function (e) {
        //    if (e) console.error("+++++++++++++++err",JSON.stringify(e));
        //    else{
        //      $location.path('/')
        //      $scope.$apply();
        //      console.log("+++++++++++++++success")
        //    }
        //  });
        //}



        //WidgetSubmit.save();
        /**
         * onLogin() listens when user logins using buildfire.auth api.
         */
        buildfire.auth.onLogin(loginCallback);
        buildfire.auth.onLogout(logoutCallback);
        /**
         * Check for current logged in user, if not show Login screen
         */
        buildfire.auth.getCurrentUser(function (err, user) {
          console.log("_______________________", user);
          if (user) {
            WidgetSubmit.currentLoggedInUser = user;
            var searchData = {
              userName:WidgetSubmit.currentLoggedInUser.username
            };
            $scope.$digest();
          }
          else
            WidgetSubmit.openLogin();
        });
        WidgetSubmit.rating1 = 5;
        WidgetSubmit.rating2 = 2;
        WidgetSubmit.isReadonly = true;
        WidgetSubmit.rateFunction = function(rating) {
          console.log('Rating selected: ' + rating);
        };
      }]);
})(window.angular, window.buildfire);

