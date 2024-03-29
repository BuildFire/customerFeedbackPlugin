'use strict';

(function (angular, buildfire) {
  angular
    .module('customerFeedbackPluginWidget')
    .controller('WidgetHomeCtrl', ['$scope','$location', '$rootScope', '$sce', '$anchorScroll', '$filter', 'DataStore', 'TAG_NAMES','EVENTS', 'ViewStack',
      function ($scope, $location, $rootScope, $sce, $anchorScroll, $filter, DataStore, TAG_NAMES, EVENTS, ViewStack) {
        var WidgetHome = this;
        var skip = 0;
        var limit = 10;
        WidgetHome.chatData = "";
        WidgetHome.listeners = {};
        WidgetHome.buildfire = buildfire;
        WidgetHome.waitAPICompletion = false;
        WidgetHome.totalRating = 0;
        WidgetHome.ratingAverage = 0;
        WidgetHome.noMore = false;
        $rootScope.deviceHeight = window.innerHeight;
        $rootScope.deviceWidth = window.innerWidth;
        $rootScope.titlebarVisibility = window.titlebarVisibility;

        WidgetHome.currentView = ViewStack.getCurrentView();
           //Refresh list of bookmarks on pulling the tile bar
          buildfire.datastore.onRefresh(function () {
              skip = 0;
              WidgetHome.noMore = false;
              WidgetHome.chatMessageData = [];
              WidgetHome.getChatData();
          });


          WidgetHome.safeHtml = function (html) {
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

          /**
           * Method to open buildfire auth login pop up and allow user to login using credentials.
           */
          WidgetHome.openLogin = function () {
              buildfire.auth.login({}, function () {

              });
          };

          var loginCallback = function () {
              buildfire.auth.getCurrentUser(function (err, user) {
                  if (user) {
                      WidgetHome.currentLoggedInUser = user;

                    if(!WidgetHome.chatMessageData || !WidgetHome.chatMessageData.length)
                        WidgetHome.getChatData();
                      if(!WidgetHome.reviews || !WidgetHome.reviews.length) {
                        $rootScope.$broadcast(EVENTS.LOGIN);
                        getReviews();
                      }
                      if (!$scope.$$phase)
                          $scope.$digest();
                  }
              });
          };

          var logoutCallback = function () {
            WidgetHome.currentLoggedInUser = null;
              WidgetHome.lastRating = null;
              WidgetHome.reviews = [];
              WidgetHome.chatMessageData = [];
            ViewStack.popAllViews();
            $rootScope.$broadcast(EVENTS.LOGOUT);

              if (!$scope.$$phase)
                  $scope.$digest();
          };
        

        function init() {
            var success = function (result) {
                    WidgetHome.data = result.data;
                    if (!WidgetHome.data.design)
                        WidgetHome.data.design = {};
                    if (!WidgetHome.data.design.backgroundImage) {
                        $rootScope.backgroundImage = "";
                    } else {
                        $rootScope.backgroundImage = WidgetHome.data.design.backgroundImage;
                    }
                }
                , error = function (err) {
                    console.error('Error while getting data', err);
                };
            DataStore.get(TAG_NAMES.FEEDBACK_APP_INFO).then(success, error);
            getReviews();
            /**
             * Check for current logged in user, if not show ogin screen
             */
            buildfire.auth.getCurrentUser(function (err, user) {
                if (user) {
                    WidgetHome.currentLoggedInUser = user;
                }
                else
                    WidgetHome.openLogin();
            });

            /**
             * onLogin() listens when user logins using buildfire.auth api.
             */
            buildfire.auth.onLogin(loginCallback);
            buildfire.auth.onLogout(logoutCallback);
        }

        WidgetHome.initializedFABButton = function () {
            const fabSpeedDial = new buildfire.components.fabSpeedDial('#sendCommentFabContainer', {
              showOverlay: false,
              mainButton: {
                content:`
                <i>
                    <svg width="24" height="24" viewBox="0 0 24 24"  xmlns="http://www.w3.org/2000/svg">
                        <g id="icons/send" clip-path="url(#clip0_1245_218)">
                            <path id="Vector" d="M3.4 20.4L20.85 12.92C21.66 12.57 21.66 11.43 20.85 11.08L3.4 3.60002C2.74 3.31002 2.01 3.80002 2.01 4.51002L2 9.12002C2 9.62002 2.37 10.05 2.87 10.11L17 12L2.87 13.88C2.37 13.95 2 14.38 2 14.88L2.01 19.49C2.01 20.2 2.74 20.69 3.4 20.4V20.4Z"/>
                        </g>
                        <defs>
                            <clipPath id="clip0_1245_218">
                                <rect width="24" height="24" />
                            </clipPath>
                        </defs>
                    </svg>
                </i>
                `,
                type: 'success',
              },
            });

            fabSpeedDial.onMainButtonClick = event => {
              WidgetHome.showReviewDialog();
              $scope.$apply();
            };
          }

          WidgetHome.showReviewDialog = function(){
            buildfire.input.showTextDialog(
              {
                placeholder: $rootScope.state.strings.addReviewMessage.typeYourMessage || 'Type your message...',
                saveText: $rootScope.state.strings.addReviewMessage.dialogSave || 'Save',
                cancelText: $rootScope.state.strings.addReviewMessage.dialogCancel || 'Cancel',
              },
              (err, response) => {
                if (err) return console.error(err);
                if (response.cancelled) return;
                if(response.results[0].textValue.trim() !== ''){
                    WidgetHome.chatData = response.results[0].textValue,
                    WidgetHome.chatMessageObj=
                    {
                        chatMessage:WidgetHome.chatData,
                        chatTime: new Date(),
                        chatFrom: WidgetHome.currentLoggedInUser.displayName,
                        id: WidgetHome.currentLoggedInUser._id
                    };
                    WidgetHome.sendMessage();
                    $scope.$apply();
                }
              }
            );
          }

        init();

          WidgetHome.openWall = function () {
              if (WidgetHome.currentLoggedInUser) {
                  ViewStack.push({
                      template: 'wall'
                  });
              } else {
                  WidgetHome.openLogin();
              }
          };

          WidgetHome.openSubmit = function () {
              if(WidgetHome.currentLoggedInUser) {
                  ViewStack.push({
                      template: 'submit'
                  });
              } else {
                  WidgetHome.openLogin();
              }
          };



          WidgetHome.showDescription = function (description) {
              if (typeof description != 'undefined')
                  return !((description == '<p>&nbsp;<br></p>') || (description == '<p><br data-mce-bogus="1"></p>') || (description == ''));
              else
                  return false;
          };

        function getReviews() {
                buildfire.userData.search({}, 'AppRatings2', function (err, results) {
                    if (err){
                        console.error("++++++++++++++ctrlerrddd",JSON.stringify(err));
                        if (!$scope.$$phase)
                            $scope.$digest();
                    }
                    else {
                        WidgetHome.reviews = results || [];
                        results.forEach(review => {
                            WidgetHome.totalRating += Number(review.data.starRating);
                        });
                        WidgetHome.ratingAverage = WidgetHome.currentView.params.data.data.starRating;
                        WidgetHome.startPoints = WidgetHome.currentView.params.data.data.starRating / (WidgetHome.reviews.length )
                        WidgetHome.lastReviewComment = WidgetHome.currentView.params.data.data.Message;
                        WidgetHome.lastReviewDate = WidgetHome.currentView.params.data.data.addedDate;
                        WidgetHome.lastRating = WidgetHome.currentView.params.data.data.starRating;
                        if (!$scope.$$phase)
                            $scope.$digest();
                    }
                });
        }

          WidgetHome.getChatData = function () {
              if (!WidgetHome.currentLoggedInUser) {
                  buildfire.auth.getCurrentUser(function (err, user) {
                      if (user) {
                          WidgetHome.currentLoggedInUser = user;
                          WidgetHome.getChatData();
                      }
                      else
                          WidgetHome.openLogin();
                  });
              } else if (!WidgetHome.waitAPICompletion) {
                  WidgetHome.waitAPICompletion = true;
                  var tagName = 'chatData-' + WidgetHome.currentLoggedInUser._id;
                  buildfire.userData.search({sort: {chatTime: -1}, skip: skip, limit: limit}, tagName, function (err, results) {
                      if (err) {
                          console.error("Error", JSON.stringify(err));
                      }
                      else {
                          if (results.length < limit) {
                              WidgetHome.noMore = true;
                          }
                          WidgetHome.chatMessageData = WidgetHome.chatMessageData ? WidgetHome.chatMessageData : [];
                          WidgetHome.chatMessageData = WidgetHome.chatMessageData.concat(results);
                          WidgetHome.chatMessageData = $filter('unique')(WidgetHome.chatMessageData, 'id');
                          skip = skip + results.length;
                          if (!$scope.$$phase)
                              $scope.$digest();
                      }
                      WidgetHome.waitAPICompletion = false;
                  });
              }
          }

        /* Initialize current logged in user as null. This field is re-initialized if user is already logged in or user login user auth api.
         */
        WidgetHome.currentLoggedInUser = null;

          WidgetHome.sendMessage = function(){
            var tagName = 'chatData-' + WidgetHome.currentLoggedInUser._id;
            WidgetHome.chatMessageObj=
            {
                chatMessage:WidgetHome.chatData,
                chatTime: new Date(),
                chatFrom: WidgetHome.currentLoggedInUser.displayName,
                id: WidgetHome.currentLoggedInUser._id
            };

              if(WidgetHome.chatData != '') {
                  buildfire.userData.insert(WidgetHome.chatMessageObj, tagName, function (err, result) {
                      if (err) console.error("+++++++++++++++err", JSON.stringify(err));
                      else {
                          WidgetHome.chatData = '';
                          $rootScope.$broadcast("COMMENT_ADDED");
                          buildfire.messaging.sendMessageToControl({'name': EVENTS.CHAT_ADDED, 'data': result});
                          WidgetHome.chatMessageData = WidgetHome.chatMessageData ? WidgetHome.chatMessageData : [];
                          WidgetHome.chatMessageData.unshift(result);
                          if (!$scope.$$phase)
                              $scope.$digest();
                          // the element you wish to scroll to.
                          $location.hash('top');

                          // call $anchorScroll()
                          $anchorScroll();
                          buildfire.navigation.scrollTop();
                      }
                  });
              }

        }

          var onUpdateCallback = function (event) {

              setTimeout(function () {
                  if (event) {
                      switch (event.tag) {
                          case TAG_NAMES.FEEDBACK_APP_INFO:
                              WidgetHome.data = event.data;
                              if (!WidgetHome.data.design)
                                  WidgetHome.data.design = {};
                              /*if (!WidgetHome.data.content)
                                  WidgetHome.data.content = {};*/
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


          WidgetHome.listeners[EVENTS.REVIEW_CREATED] = $rootScope.$on(EVENTS.REVIEW_CREATED, function (e, result) {
                  if (!WidgetHome.reviews) {
                      WidgetHome.reviews = [];
                  }
              WidgetHome.reviews.push(result.data);
              if(WidgetHome.reviews && WidgetHome.reviews.length) {
                  WidgetHome.lastRating = WidgetHome.reviews.reduce(function (a, b) {
                      return {data: {starRating: parseFloat(a.data.starRating) + parseFloat(b.data.starRating)}}; // returns object with property x
                  })
              }
              WidgetHome.startPoints = WidgetHome.lastRating && WidgetHome.lastRating.data && WidgetHome.lastRating.data.starRating / (WidgetHome.reviews.length )
              WidgetHome.lastReviewComment = WidgetHome.reviews && WidgetHome.reviews.length && WidgetHome.reviews[WidgetHome.reviews.length-1].data.Message;
              if(WidgetHome.reviews && WidgetHome.reviews.length) {
                  WidgetHome.lastRating = WidgetHome.reviews[WidgetHome.reviews.length - 1].data.starRating;
              }
              if (!$scope.$$phase)
                  $scope.$digest();
          });

          

        buildfire.messaging.onReceivedMessage = (event)=> {
            if (event) {
                switch (event.name) {
                    case EVENTS.CHAT_ADDED :
                        if(WidgetHome.currentLoggedInUser && WidgetHome.currentLoggedInUser._id && (event.data.tag ==  'chatData-' + WidgetHome.currentLoggedInUser._id)){
                            if (event.data && event.data.data) {
                                WidgetHome.chatMessageData = WidgetHome.chatMessageData ? WidgetHome.chatMessageData : [];
                                WidgetHome.chatMessageData.unshift(event.data);
                            }
                        }
                        break;
                    default :
                        break;
                }
                if (!$scope.$$phase)
                    $scope.$digest();
            }
        };

          WidgetHome.listeners['CHANGED'] = $rootScope.$on('VIEW_CHANGED', function (e, type, view) {

              if (!ViewStack.hasViews()) {
                  //bind on refresh again

                  buildfire.datastore.onRefresh(function () {
                      skip = 0;
                      WidgetHome.noMore = false;
                      WidgetHome.chatMessageData = [];
                      WidgetHome.getChatData();
                  });
              }
          });
          $scope.$on("$destroy", function () {
              for (var i in WidgetHome.listeners) {
                  if (WidgetHome.listeners.hasOwnProperty(i)) {
                      WidgetHome.listeners[i]();
                  }
              }
              DataStore.clearListener();
          });
      }]);
})(window.angular, window.buildfire);

