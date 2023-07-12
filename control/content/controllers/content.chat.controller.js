'use strict';

(function (angular) {
    angular
        .module('customerFeedbackPluginContent')
        .controller('ContentChatCtrl', ['$scope', '$routeParams', '$location', '$filter', 'Buildfire', 'TAG_NAME', 'STATUS_CODE', 'DataStore','EVENTS',
            function ($scope, $routeParams, $location, $filter, Buildfire, TAG_NAME, STATUS_CODE, DataStore, EVENTS) {
                var ContentChat = this;
                var encodedReview = $routeParams.encodedReview;
                var review = JSON.parse(decodeURIComponent(encodedReview));
                var tagName = 'chatData-' + review.userToken;
                var skip = 0;
                var limit = 10;
                ContentChat.chatData = "";
                ContentChat.noMore = false;
                ContentChat.waitAPICompletion = false;
                ContentChat.review = review;
                /*
                 * Go pull any previously saved data
                 * */

                buildfire.auth.getCurrentUser(function (err, user) {
                    console.log("_______________________ssss", user);
                    if (user) {
                        ContentChat.currentLoggedInUser = user;
//                        ContentChat.getChatData();
                    }
                });

                ContentChat.getChatData = function(){
                    console.log('inside getChatData-------------');
                    if(!ContentChat.waitAPICompletion) {
                        ContentChat.waitAPICompletion = true;
                        buildfire.userData.search({skip: skip, limit: limit}, tagName, function (err, results) {
                            if (err) {
                                console.error("Error", JSON.stringify(err));
                            }
                            else {
                                if (results.length < limit) {
                                    ContentChat.noMore = true;
                                }
                                console.log("++++++++++++++successsChat", results);
                                ContentChat.chatMessageData = ContentChat.chatMessageData ? ContentChat.chatMessageData : [];
                                ContentChat.chatMessageData = ContentChat.chatMessageData.concat(results);
                                ContentChat.chatMessageData = $filter('unique')(ContentChat.chatMessageData, 'id');
                                skip = skip + results.length;
                                //$scope.complains = results;
                                $scope.$apply();
                            }
                            ContentChat.waitAPICompletion = false;
                        });
                    }
                }
                 var init = function () {
//                     ContentChat.getChatData();
                     /**
                      * Check for current logged in user, if not show ogin screen
                      */
                     buildfire.auth.getCurrentUser(function (err, user) {
                         console.log("_______________________ssss", user);
                         if (user) {
                             ContentChat.currentLoggedInUser = user;
                         }
                     });
                };

                ContentChat.sendMessage = function() {
                    ContentChat.chatMessageObj =
                    {
                        chatMessage: ContentChat.chatData,
                        chatTime: new Date(),
                        chatFrom: (ContentChat.currentLoggedInUser.firstName ? ContentChat.currentLoggedInUser.firstName + ' ' + ContentChat.currentLoggedInUser.lastName : ''),
                        id: ContentChat.currentLoggedInUser._id
                    }
                    if (ContentChat.chatData) {
                            buildfire.userData.insert(ContentChat.chatMessageObj, tagName, ContentChat.review.userToken, function (err, result) {
                                if (err) console.error("Error : ", JSON.stringify(err));
                                else {
                                    ContentChat.chatMessageData.unshift(result);
                                    buildfire.messaging.sendMessageToWidget({'name': EVENTS.CHAT_ADDED, 'data': result});
                                    ContentChat.chatData = '';
                                    $scope.$apply();
//                                    $location.path('/chat/' + $routeParams.userToken);
                                }
                            });
                    }
                }

                init();
                buildfire.messaging.onReceivedMessage = function (event) {
                    console.log('Content syn called method in content.home.controller called-----', event);
                    if (event) {
                        console.log("++++++++++++", event)
                        switch (event.name) {
                            case EVENTS.CHAT_ADDED :
                                if (event.data.data) {
                                    ContentChat.chatMessageData = ContentChat.chatMessageData ? ContentChat.chatMessageData : [];
                                    ContentChat.chatMessageData.unshift(event.data);
                                }
                                break;
                            default :
                                break;
                        }
                        if (!$scope.$$phase)
                            $scope.$digest();
                    }
                };

                document.getElementById('commentInput').addEventListener('keyup',(e)=>{
                    if(e.target.value.trim() !== '') {
                        document.getElementById('sendCommentButton').disabled = false;
                    }else{
                        document.getElementById('sendCommentButton').disabled = true;
                    }
                });
            }]);
})(window.angular);

