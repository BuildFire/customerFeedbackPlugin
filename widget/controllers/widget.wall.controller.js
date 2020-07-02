'use strict';

(function (angular, buildfire) {
  angular
    .module('customerFeedbackPluginWidget')
      .controller('WidgetWallCtrl', ['$scope','$location', '$rootScope', '$filter', 'DataStore', 'TAG_NAMES', 'ViewStack', 'EVENTS',
        function ($scope, $location, $rootScope, $filter, DataStore, TAG_NAMES, ViewStack, EVENTS) {

          var WidgetWall = this;
          var skip = 0;
          var limit = 15;
          var currentView = ViewStack.getCurrentView();
          WidgetWall.waitAPICompletion = false;
          WidgetWall.noMore = false;
          WidgetWall.buildfire = buildfire;
          WidgetWall.noReviews = false;
          WidgetWall.reviewButtonText = "";
          WidgetWall.totalRating = 0;
          WidgetWall.chatCommentCount = 0;
          WidgetWall.listeners = [];
          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
          /* Initialize current logged in user as null. This field is re-initialized if user is already logged in or user login user auth api.
           */
          WidgetWall.currentLoggedInUser = null;

            function init() {
                var success = function (result) {
                        WidgetWall.data = result.data;
                        if (!WidgetWall.data.design)
                            WidgetWall.data.design = {};
                        /*if (!WidgetHome.data.content)
                         WidgetHome.data.content = {};*/
                        console.log("WidgetHome.data.design.backgroundImage", WidgetWall.data.design.backgroundImage);
                        if (!WidgetWall.data.design.backgroundImage) {
                            $rootScope.backgroundImage = "";
                        } else {
                            $rootScope.backgroundImage = WidgetWall.data.design.backgroundImage;
                        }
//                        getReviews();
                    }
                    , error = function (err) {
                        console.error('Error while getting data', err);
                    };
                DataStore.get(TAG_NAMES.FEEDBACK_APP_INFO).then(success, error);
            }

            init();

            WidgetWall.getReviews = function () {
                // buildfire.history.push('Submit Reviewsss', {});
                console.log('Inside getReviews---------');
                if(!WidgetWall.waitAPICompletion) {
                    WidgetWall.waitAPICompletion = true;
                  buildfire.userData.search({sort: {addedDate: -1}, skip: skip, limit: limit}, 'AppRatings2', function (err, results) {
                        if (err) {
                            console.error("++++++++++++++ctrlerrddd", JSON.stringify(err));
                            $location.path('/');
                            $scope.$apply();
                        }
                        else {
                            console.log("++++++++++++++ctrldd", results);
                            if (results.length < limit) {
                                WidgetWall.noMore = true;
                            }
                            WidgetWall.reviews = WidgetWall.reviews ? WidgetWall.reviews : [];
                            WidgetWall.reviews = WidgetWall.reviews.concat(results);
                            WidgetWall.reviews = $filter('unique')(WidgetWall.reviews, 'id');
                            //WidgetWall.lastRating = results[results.length-1].data.starRating;
                          if(results.length) {
                            WidgetWall.noReviews = false;
                            WidgetWall.reviewButtonText = "Write a Review";
                            WidgetWall.ratingsTotal = results.reduce(function (a, b) {
                              return {data: {starRating: parseFloat(a.data.starRating) + parseFloat(b.data.starRating)}}; // returns object with property x
                            });
                            console.log("+++++++++++++++++++++SSSSSSSSSSSS", WidgetWall.reviews.length, WidgetWall.ratingsTotal.data.starRating,  WidgetWall.reviews)
                            WidgetWall.totalRating = WidgetWall.totalRating + WidgetWall.ratingsTotal.data.starRating
                            WidgetWall.startPoints =  WidgetWall.totalRating / (WidgetWall.reviews.length );
                            WidgetWall.lastRating = WidgetWall.reviews && WidgetWall.reviews.length && WidgetWall.reviews[WidgetWall.reviews.length - 1].data.starRating;
                          } else {

                            WidgetWall.noReviews = true;
                            WidgetWall.reviewButtonText = "Submit Review";
                          }
                            //$scope.complains = results;
                            skip = skip + results.length;
                            $scope.$apply();
                        }
                        WidgetWall.waitAPICompletion = false;
                    });
                }
            };

          /**
           * Method to open buildfire auth login pop up and allow user to login using credentials.
           */
          WidgetWall.openLogin = function () {
              buildfire.auth.login({}, function () {

              });
             // $scope.$apply();
          };

          var loginCallback = function () {
            buildfire.auth.getCurrentUser(function (err, user) {
              console.log("_______________________rrr", user);
              WidgetWall.waitAPICompletion = false;
              $scope.$digest();
              if (user) {
                WidgetWall.currentLoggedInUser = user;
                var tagName = 'chatData-' + WidgetWall.currentLoggedInUser._id;
                buildfire.userData.search({}, tagName, function (err, results) {
                  if (err) {
                    console.error("Error", JSON.stringify(err));
                  }
                  else {
                    console.log("_______result", results);
                    if(results && results.length){
                      WidgetWall.chatCommentCount = results.length;
                      $scope.$digest();
                    }
                  }
                });
                console.log("_______________________rrr22", user);
                  //if(!WidgetWall.reviews || !WidgetWall.reviews.length) {
                    skip = 0;
                    WidgetWall.startPoints = 0;
                    WidgetWall.totalRating= 0;
                    WidgetWall.getReviews();
                //  }
                $scope.$apply();
              }
            });
          };



          var logoutCallback = function () {
            //init();
            WidgetWall.currentLoggedInUser = null;
           //ViewStack.popAllViews();
            WidgetWall.noReviews = true;
            WidgetWall.reviewButtonText = "Submit Review";
            WidgetWall.reviews = [];
            $scope.$digest();
          };


          WidgetWall.listeners[EVENTS.LOGOUT] = $rootScope.$on(EVENTS.LOGOUT, function (e) {
            WidgetWall.currentLoggedInUser = null;
            WidgetWall.noReviews = true;
            WidgetWall.reviewButtonText = "Submit Review";
            WidgetWall.reviews = [];
            init();
            if (!$scope.$$phase)
              $scope.$digest();
          });         /* WidgetWall.goBack = function(){
            $location.path("/submit");
          }*/
          WidgetWall.listeners[EVENTS.LOGIN] = $rootScope.$on(EVENTS.LOGIN, function (e) {
            buildfire.auth.getCurrentUser(function (err, user) {
              console.log("_______________________rrr", user);
              WidgetWall.waitAPICompletion = false;
              $scope.$digest();
              if (user) {
                WidgetWall.currentLoggedInUser = user;
                console.log("_______________________rrr22", user);
                //if(!WidgetWall.reviews || !WidgetWall.reviews.length) {
                skip = 0;
                WidgetWall.startPoints = 0;
                WidgetWall.totalRating= 0;
                WidgetWall.getReviews();
                //  }
                $scope.$apply();
              }
            })
          });

          WidgetWall.submitReview = function () {
                if(WidgetWall.currentLoggedInUser) {
                    ViewStack.push({
                        template: 'submit',
                        params: {
                            lastReviewCount: WidgetWall.lastRating
                        }
                    });
                } else {
                    WidgetWall.openLogin();
                }
            };

          WidgetWall.goToChat = function (data) {
              ViewStack.push({
                template: 'home',
                params: {
                  data: data
                }
              });
          };

            $rootScope.$on(EVENTS.REVIEW_CREATED, function (e, result) {
                console.log('inside review added event listener:::::::::::', result);
              if(!WidgetWall.reviews) {
                WidgetWall.reviews = [];
              }
                WidgetWall.reviews.push(result.data);
              WidgetWall.noReviews = false;
              WidgetWall.reviewButtonText = "Write a Review";
              WidgetWall.ratingsTotal = WidgetWall.reviews.reduce(function (a, b) {
                  return {data: {starRating: parseFloat(a.data.starRating) + parseFloat(b.data.starRating)}}; // returns object with property x
                });
              WidgetWall.totalRating = WidgetWall.ratingsTotal.data.starRating;
              console.log("+++++++++++++++++++++SSSSSSSSSSSS", WidgetWall.reviews.length, WidgetWall.ratingsTotal.data.starRating, WidgetWall.totalRating)

              WidgetWall.startPoints = WidgetWall.ratingsTotal.data.starRating / (WidgetWall.reviews.length );
                WidgetWall.lastRating = WidgetWall.reviews && WidgetWall.reviews.length && WidgetWall.reviews[WidgetWall.reviews.length - 1].data.starRating;
                if (!$scope.$$phase)
                    $scope.$digest();
            });

          /**
           * onLogin() listens when user logins using buildfire.auth api.
           */
          buildfire.auth.onLogin(loginCallback);
          buildfire.auth.onLogout(logoutCallback);

          /**
           * Check for current logged in user, if not show ogin screen
           */
          buildfire.auth.getCurrentUser(function (err, user) {
              init();
            console.log("_______________________ssss", user);
            if (user) {
              WidgetWall.currentLoggedInUser = user;
              var tagName = 'chatData-' + WidgetWall.currentLoggedInUser._id;
              buildfire.userData.search({}, tagName, function (err, results) {
                if (err) {
                  console.error("Error", JSON.stringify(err));
                }
                else {
                  console.log("_______result", results);
                  if(results && results.length){
                    //WidgetWall.chatCommentCount = results.length;
                    results.map(item => {
                      if(WidgetWall.reviews && WidgetWall.reviews.length) {
                        //if(item.data.chatId === )
                        let found = WidgetWall.reviews.find(review => review.id === item.data.chatId)
                        if(found) {
                          let index = WidgetWall.reviews.indexOf(found);
                          WidgetWall.reviews[index].chatCommentCount = WidgetWall.reviews[index].chatCommentCount ? WidgetWall.reviews[index].chatCommentCount + 1 : 1;
                          console.log("CHAT ITEM", item)
                        console.log("REVIEWS", WidgetWall.reviews)
                        }
                        
                      }
                      $scope.$digest();
                    })
                  }
                }
              });
            }else{
              WidgetWall.noReviews = true;
              WidgetWall.reviewButtonText = "Submit Review";
              WidgetWall.reviews = [];
            }
          });

            var onUpdateCallback = function (event) {
                setTimeout(function () {
                    if (event) {
                        switch (event.tag) {
                            case TAG_NAMES.FEEDBACK_APP_INFO:
                                WidgetWall.data = event.data;
                                if (!WidgetWall.data.design)
                                    WidgetWall.data.design = {};
                                /*if (!WidgetWall.data.content)
                                 WidgetWall.data.content = {};*/
                                if (!event.data.design.backgroundImage) {
                                    $rootScope.backgroundImage = "";
                                } else {
                                    $rootScope.backgroundImage = event.data.design.backgroundImage;
                                }
                                break;
                        }
                        $rootScope.$digest();
                    }
                }, 0);
            };

            /**
             * DataStore.onUpdate() is bound to listen any changes in datastore
             */
            DataStore.onUpdate().then(null, null, onUpdateCallback);

            //Update comment count when added on chat page
          $rootScope.$on('COMMENT_ADDED', function (e) {
            WidgetWall.chatCommentCount += 1;
            $scope.$digest();
          });

          buildfire.messaging.onReceivedMessage = function (event) {
            if(event && event.name == "CHAT_ADDED" && event.data){
              if(WidgetWall.currentLoggedInUser && WidgetWall.currentLoggedInUser._id && (event.data.tag ==  'chatData-' + WidgetWall.currentLoggedInUser._id)){
                WidgetWall.chatCommentCount += 1;
                $scope.$digest();
              }
            }
          }

        }]);
})(window.angular, window.buildfire);

