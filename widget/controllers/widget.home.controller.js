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
        WidgetHome.noMore = false;
          $rootScope.deviceHeight = window.innerHeight;
          $rootScope.deviceWidth = window.innerWidth;
       //   $rootScope.backgroundImage = "";

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
                      console.log('element is: ', src, src.indexOf('http'));
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
//              $scope.$apply();
          };

          var loginCallback = function () {
              buildfire.auth.getCurrentUser(function (err, user) {
                  console.log("_______________________rrr", user);

//                  $scope.$digest();
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
                    /*if (!WidgetHome.data.content)
                        WidgetHome.data.content = {};*/
                    console.log("WidgetHome.data.design.backgroundImage", WidgetHome.data.design.backgroundImage);
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
                console.log("_______________________ssss", user);
                if (user) {
                    WidgetHome.currentLoggedInUser = user;
//                    WidgetHome.getChatData();
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

        init();

          WidgetHome.openWall = function () {
              if (WidgetHome.currentLoggedInUser) {
                  ViewStack.push({
                      template: 'wall'
                  });
              } else {
                  WidgetHome.openLogin();
              }
              /*if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.storeURL)
               buildfire.navigation.openWindow(WidgetHome.data.content.storeURL + '/cart', "_system");*/
          };

          WidgetHome.openSubmit = function () {
              if(WidgetHome.currentLoggedInUser) {
                  ViewStack.push({
                      template: 'submit'
                  });
              } else {
                  WidgetHome.openLogin();
              }
              /*if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.storeURL)
               buildfire.navigation.openWindow(WidgetHome.data.content.storeURL + '/cart', "_system");*/
          };



          WidgetHome.showDescription = function (description) {
              console.log('Description---------------------------------------', description);
              if (typeof description != 'undefined')
                  return !((description == '<p>&nbsp;<br></p>') || (description == '<p><br data-mce-bogus="1"></p>') || (description == ''));
              else
                  return false;
          };

        function getReviews() {
                buildfire.userData.search({}, 'AppRatings2', function (err, results) {
                    if (err){
                        console.error("++++++++++++++ctrlerrddd",JSON.stringify(err));
//                        $location.path('/');
                        if (!$scope.$$phase)
                            $scope.$digest();
                    }
                    else {
                        console.log("++++++++++++++ctrldd home", results);

                        WidgetHome.reviews = results || [];
                        //WidgetWall.lastRating = results[results.length-1].data.starRating;
                        //if(results && results.length) {
                        //    WidgetHome.lastRating = results.reduce(function (a, b) {
                        //        var startRating =  {data: {starRating: parseFloat(a.data.starRating) + parseFloat(b.data.starRating)}}; // returns object with property x
                        //        return startRating.data.starRating
                        //    })
                        //}
                        WidgetHome.startPoints = WidgetHome.currentView.params.data.data.starRating / (WidgetHome.reviews.length )
                        WidgetHome.lastReviewComment = WidgetHome.currentView.params.data.data.Message;
                       // if(WidgetHome.data && WidgetHome.reviews && WidgetHome.reviews.length) {
                            WidgetHome.lastRating = WidgetHome.currentView.params.data.data.starRating;
                      //  }
                        //$scope.complains = results;
                        if (!$scope.$$phase)
                            $scope.$digest();
                        /*ViewStack.push({
                            template: 'home',
                            params: {
                                controller: "WidgetHomeCtrl as WidgetHome",
                                shouldUpdateTemplate: true
                            }
                        });*/
                    }
                });
        }

          WidgetHome.getChatData = function () {
              console.log('Inside getChatData -----------');
              if (!WidgetHome.currentLoggedInUser) {
                  buildfire.auth.getCurrentUser(function (err, user) {
                      console.log("_____fff", user);
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
                          console.log("++++++++++++++successsChat", results);
                          WidgetHome.chatMessageData = WidgetHome.chatMessageData ? WidgetHome.chatMessageData : [];
                          /*WidgetHome.chatMessageData = WidgetHome.chatMessageData.concat(results);
                          WidgetHome.chatMessageData = $filter('unique')(WidgetHome.chatMessageData, 'id');
                          skip = skip + results.length;
                          */
                        results.map(item => {
                            if(item.data.chatId === WidgetHome.currentView.params.data.id) {
                                WidgetHome.chatMessageData.push(item)
                            }
                        })
                          //$scope.complains = results;
                          if (!$scope.$$phase)
                              $scope.$digest();
                      }
                      WidgetHome.waitAPICompletion = false;
                  });
              }
          }

          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        /* Initialize current logged in user as null. This field is re-initialized if user is already logged in or user login user auth api.
         */
        WidgetHome.currentLoggedInUser = null;

          WidgetHome.sendMessage = function(){
              console.log("WIDGET HOME", WidgetHome)
            var tagName = 'chatData-' + WidgetHome.currentLoggedInUser._id;
            WidgetHome.chatMessageObj=
            {
                chatMessage:WidgetHome.chatData,
                chatTime: new Date(),
                chatFrom: WidgetHome.currentLoggedInUser.displayName,
                chatId: WidgetHome.currentView.params.data.id,
                id: WidgetHome.currentLoggedInUser._id
            };

              if(WidgetHome.chatData != '') {
                  buildfire.userData.insert(WidgetHome.chatMessageObj, tagName, function (err, result) {
                      if (err) console.error("+++++++++++++++err", JSON.stringify(err));
                      else {
                          WidgetHome.chatData = '';
                          $rootScope.$broadcast("COMMENT_ADDED:chatId", WidgetHome.chatMessageObj.chatId);
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
                          console.log("+++++++++++++++success")
                      }
                  });
              }

        }

          /*$rootScope.$on("Carousel:LOADED", function () {
              WidgetHome.view = null;
              if (!WidgetHome.view) {
                  WidgetHome.view = new buildfire.components.carousel.view("#carousel", [], "WideScreen");
              }
              if (WidgetHome.data && WidgetHome.data.content.carouselImages) {
                  WidgetHome.view.loadItems(WidgetHome.data.content.carouselImages, null, "WideScreen");
              } else {
                  WidgetHome.view.loadItems([]);
              }
          });
*/
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
                              /*if (WidgetHome.view) {
                                  WidgetHome.view.loadItems(WidgetHome.data.content.carouselImages);
                              }*/
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
              console.log('inside review added event listener:::::::::::', result);
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

          //WidgetHome.listeners[EVENTS.LOGOUT] = $rootScope.$on(EVENTS.LOGOUT, function (e) {
          //    console.log('inside logout event listener::::');
          //    WidgetHome.lastRating = null;
          //    WidgetHome.currentLoggedInUser = null;
          //    WidgetHome.reviews = [];
          //    WidgetHome.chatMessageData = [];
          //    init();
          //    if (!$scope.$$phase)
          //        $scope.$digest();
          //});

          buildfire.messaging.onReceivedMessage = function (event) {
              console.log('Content syn called method in content.home.controller called-----', event);
              if (event) {
                  console.log("++++++++++++", event);
                  switch (event.name) {
                      case EVENTS.CHAT_ADDED :
                          if (event.data && event.data.data) {
//                              WidgetHome.chatMessageData = event.data.data;
                              WidgetHome.chatMessageData = WidgetHome.chatMessageData ? WidgetHome.chatMessageData : [];
                              WidgetHome.chatMessageData.unshift(event.data);
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

