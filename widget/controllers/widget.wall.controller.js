'use strict';

(function (angular, buildfire) {
  angular
    .module('customerFeedbackPluginWidget')
      .controller('WidgetWallCtrl', ['$scope','$location', '$rootScope', '$filter', 'DataStore', 'TAG_NAMES', 'ViewStack', 'EVENTS', '$sce',
        function ($scope, $location, $rootScope, $filter, DataStore, TAG_NAMES, ViewStack, EVENTS, $sce) {

          var WidgetWall = this;
          var skip = 0;
          var limit = 15;
          var currentView = ViewStack.getCurrentView();
          WidgetWall.waitAPICompletion = false;
          WidgetWall.noMore = false;
          WidgetWall.buildfire = buildfire;
          WidgetWall.noReviews = true;
          WidgetWall.reviewButtonText = "";
          WidgetWall.totalRating = 0;
          WidgetWall.chatCommentCount = 0;
          WidgetWall.listeners = [];
          WidgetWall.titlebarVisibility = window.titlebarVisibility;
          /* Initialize current logged in user as null. This field is re-initialized if user is already logged in or user login user auth api.
           */
          WidgetWall.currentLoggedInUser = null;

            function init() {
              var success = function (result) {
                WidgetWall.data = result.data;
                        if (!WidgetWall.data.design)
                            WidgetWall.data.design = {};
                        if (!WidgetWall.data.design.backgroundImage) {
                            $rootScope.backgroundImage = "";
                        } else {
                            $rootScope.backgroundImage = WidgetWall.data.design.backgroundImage;
                        }
                    }
                    , error = function (err) {
                        console.error('Error while getting data', err);
                    };
                DataStore.get(TAG_NAMES.FEEDBACK_APP_INFO).then(success, error);
            }

            init();

            WidgetWall.getReviews = function () {
                if(!WidgetWall.waitAPICompletion) {
                    WidgetWall.waitAPICompletion = true;
                  buildfire.userData.search({sort: {addedDate: -1}, skip: skip, limit: limit}, 'AppRatings2', function (err, results) {
                        if (err) {
                            console.error("++++++++++++++ctrlerrddd", JSON.stringify(err));
                            $location.path('/');
                            $scope.$apply();
                        }
                        else {
                            if (results.length < limit) {
                                WidgetWall.noMore = true;
                            }
                            WidgetWall.reviews = WidgetWall.reviews ? WidgetWall.reviews : [];
                            WidgetWall.reviews = WidgetWall.reviews.concat(results);
                            WidgetWall.reviews = $filter('unique')(WidgetWall.reviews, 'id');
                          if(results.length) {
                            WidgetWall.noReviews = false;
                            WidgetWall.reviewButtonText = "Write a Review";
                            WidgetWall.ratingsTotal = results.reduce(function (a, b) {
                              return {data: {starRating: parseFloat(a.data.starRating) + parseFloat(b.data.starRating)}}; // returns object with property x
                            });
                            WidgetWall.totalRating = WidgetWall.totalRating + WidgetWall.ratingsTotal.data.starRating
                            WidgetWall.startPoints =  parseFloat((WidgetWall.totalRating / (WidgetWall.reviews.length )).toFixed(2));
                            WidgetWall.lastRating = WidgetWall.reviews && WidgetWall.reviews.length && WidgetWall.reviews[WidgetWall.reviews.length - 1].data.starRating;
                          } else {

                            WidgetWall.noReviews = true;
                            WidgetWall.reviewButtonText = "Submit Review";
                          }
                            skip = skip + results.length;
                            $scope.$apply();
                        }
                        WidgetWall.waitAPICompletion = false;
                    });

                }
                WidgetWall.initializedFABButton();
            };


          /**
           * Method to open buildfire auth login pop up and allow user to login using credentials.
           */
          WidgetWall.openLogin = function () {
              buildfire.auth.login({}, function () {

              });
          };

          var loginCallback = function () {
            buildfire.auth.getCurrentUser(function (err, user) {
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
                    if(results && results.length){
                      WidgetWall.chatCommentCount = results.length;
                      $scope.$digest();
                    }
                  }
                });
                  skip = 0;
                  WidgetWall.startPoints = 0;
                  WidgetWall.totalRating= 0;
                  WidgetWall.getReviews();
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
          WidgetWall.initializedFABButton = function () {
            const fabSpeedDial = new buildfire.components.fabSpeedDial('#fabSpeedDialContainer', {
              showOverlay: false,
              mainButton: {
                type: 'success',
              },
            });

            fabSpeedDial.onMainButtonClick = event => {
              WidgetWall.submitReview();
              $scope.$apply();
            };
          }


          WidgetWall.listeners[EVENTS.LOGOUT] = $rootScope.$on(EVENTS.LOGOUT, function (e) {
            WidgetWall.currentLoggedInUser = null;
            WidgetWall.noReviews = true;
            WidgetWall.reviewButtonText = "Submit Review";
            WidgetWall.reviews = [];
            init();
            if (!$scope.$$phase)
              $scope.$digest();
          });
          WidgetWall.listeners[EVENTS.LOGIN] = $rootScope.$on(EVENTS.LOGIN, function (e) {
            buildfire.auth.getCurrentUser(function (err, user) {
              WidgetWall.waitAPICompletion = false;
              $scope.$digest();
              if (user) {
                WidgetWall.currentLoggedInUser = user;
                skip = 0;
                WidgetWall.startPoints = 0;
                WidgetWall.totalRating= 0;
                WidgetWall.getReviews();
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
            if (user) {
              WidgetWall.currentLoggedInUser = user;
              var tagName = 'chatData-' + WidgetWall.currentLoggedInUser._id;
              buildfire.userData.search({}, tagName, function (err, results) {
                if (err) {
                  console.error("Error", JSON.stringify(err));
                }
                else {
                  if(results && results.length){
                    WidgetWall.chatCommentCount = results.length;
                    $scope.$digest();
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
              if(event){
                if(event.scope === 'removeReview'){
                    WidgetWall.totalRating = WidgetWall.totalRating - Number(event.review.data.starRating);
                    WidgetWall.startPoints = 0;
                    WidgetWall.lastRating = 0;
                    WidgetWall.reviews = WidgetWall.reviews.filter(obj => obj.id !== event.review.id);
                    if (WidgetWall.reviews.length === 0) {
                        init();
                        WidgetWall.noReviews = true;
                    }
                    $scope.$apply();
                    return;
                }
                if(event.name == "CHAT_ADDED" && event.data){
                  if(WidgetWall.currentLoggedInUser && WidgetWall.currentLoggedInUser._id && (event.data.tag ==  'chatData-' + WidgetWall.currentLoggedInUser._id)){
                    WidgetWall.chatCommentCount += 1;
                    $scope.$digest();
                  }
                }
              }
            }

            WidgetWall.safeHtml = function (html) {
              if (html) {
                  var $html = $('<div />', {html: html});
                  $html.find('iframe').each(function (index, element) {
                      var src = element.src;
                      src = src && src.indexOf('file://') != -1 ? src.replace('file://', 'http://') : src;
                      element.src = src && src.indexOf('http') != -1 ? src : 'http:' + src;
                  });
                  return $sce.trustAsHtml($html.html());
              }
          };

        }]);
})(window.angular, window.buildfire);

