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
          WidgetWall.noReviews = true;
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
                        let introductionElement = document.getElementById('introduction');
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
                        if(introductionElement) introductionElement.innerHTML = result.data.introduction;
                        setBoxShadow();
                        window.onReceivedMessageWall();
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
                            WidgetWall.startPoints =  parseFloat((WidgetWall.totalRating / (WidgetWall.reviews.length )).toFixed(2));
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
                WidgetWall.initializedFABButton();
            };

          const setBoxShadow = ()=>{
              WidgetWall.dynamicBoxShadow = `rgba(${colorToRGBA(
                  getComputedStyle(document.documentElement)
                  .getPropertyValue('--bf-theme-body-text')
                  .trim(),
                  0.2
              )}) 0 2px 8px`;
          }

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

          const colorToRGBA = (color, opacity = 1)=> {
              const isHexColor = (color) => /^#([A-Fa-f0-9]{3,4}){1,2}$/.test(color);
              const getChunksFromString = (st, chunkSize) =>
                  st.match(new RegExp(`.{${chunkSize}}`, 'g'));
              const convertHexUnitTo256 = (hexStr) =>
                  parseInt(hexStr.repeat(2 / hexStr.length), 16);
      
              if (isHexColor(color)) {
                  const chunkSize = Math.floor((color.length - 1) / 3);
                  const hexArr = getChunksFromString(color.slice(1), chunkSize);
                  const [r, g, b] = hexArr.map(convertHexUnitTo256);
                  return `${r}, ${g}, ${b},${opacity}`;
              }
          }


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

          window.onReceivedMessageWall = ()=>{
            buildfire.messaging.onReceivedMessage = function (event) {
              if(event){
                if(event.scope === 'removeReview'){
                    WidgetWall.totalRating = WidgetWall.totalRating - Number(event.review.data.starRating);
                    WidgetWall.startPoints = 0;
                    WidgetWall.lastRating = 0;
                    WidgetWall.reviews.shift();
                    if (WidgetWall.reviews.length === 0) {
                        init();
                        WidgetWall.noReviews = true;
                    }
                    $scope.$apply();
                    return;
                }
                if(event.scope === 'showComments'){
                  WidgetWall.goToChat(event.review);
                  $scope.$apply();
                  return;
                }
                if(event.scope === 'introduction'){
                  let introductionElement = document.getElementById('introduction');
                  if(introductionElement){
                    introductionElement.innerHTML = event.introductionContent;
                  }
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
          }

        }]);
})(window.angular, window.buildfire,window.onReceivedMessageWall);

