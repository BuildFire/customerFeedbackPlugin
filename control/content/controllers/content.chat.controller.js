'use strict';

(function (angular) {
    angular
        .module('customerFeedbackPluginContent')
        .controller('ContentChatCtrl', ['$scope','$rootScope', '$routeParams', '$location', '$filter', 'Buildfire', 'TAG_NAME', 'STATUS_CODE', 'DataStore','EVENTS', '$modal',
            function ($scope, $rootScope, $routeParams, $location, $filter, Buildfire, TAG_NAME, STATUS_CODE, DataStore, EVENTS, $modal) {
                var ContentChat = this;
                var tagName = 'chatData-' + $routeParams.userToken;
                var state = $rootScope.state;
                var skip = 0;
                var limit = 50;
                ContentChat.chatData = "";
                ContentChat.noMore = false;
                ContentChat.waitAPICompletion = false;
                ContentChat.numberOfComments = 0;
                ContentChat.currentReview = state.currentReview;
                /*
                 * Go pull any previously saved data
                 * */

                buildfire.auth.getCurrentUser(function (err, user) {
                    if (user) {
                        ContentChat.currentLoggedInUser = user;
                    }
                });

                ContentChat.getChatData = function(){
                    if(!ContentChat.waitAPICompletion) {
                        ContentChat.waitAPICompletion = true;
                        buildfire.userData.search({skip: skip, limit: limit, recordCount:true}, tagName, function (err, comments) {
                            if (err) {
                                console.error("Error", JSON.stringify(err));
                            }
                            else {
                                if (comments.result.length < limit) {
                                    ContentChat.noMore = true;
                                }
                                ContentChat.chatMessageData = ContentChat.chatMessageData ? ContentChat.chatMessageData : [];
                                ContentChat.chatMessageData = ContentChat.chatMessageData.concat(comments.result);
                                ContentChat.chatMessageData = $filter('unique')(ContentChat.chatMessageData, 'id');
                                ContentChat.numberOfComments = comments.totalRecord;
                                skip = skip + comments.result.length;
                                $scope.$apply();
                            }
                            ContentChat.waitAPICompletion = false;
                        });
                    }
                }
                 var init = function () {
                     /**
                      * Check for current logged in user, if not show ogin screen
                      */
                     buildfire.auth.getCurrentUser(function (err, user) {
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
                            buildfire.userData.insert(ContentChat.chatMessageObj, tagName, $routeParams.userToken, function (err, result) {
                                if (err) console.error("Error : ", JSON.stringify(err));
                                else {
                                    ContentChat.chatMessageData.unshift(result);
                                    buildfire.messaging.sendMessageToWidget({'name': EVENTS.CHAT_ADDED, 'data': result});
                                    ContentChat.chatData = '';
                                    ContentChat.numberOfComments+=1;
                                    $scope.$apply();
                                }
                            });
                    }
                }

                init();
                buildfire.messaging.onReceivedMessage = function (event) {
                    if (event) {
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

                ContentChat.deleteReview = function (review) {
                    if (review && review.id && review.userToken) {
                        var modalInstance = $modal.open({
                            templateUrl: 'templates/deleteReviewModal.html',
                            controller: 'RemovePopupCtrl',
                            controllerAs: 'RemovePopup',
                            size: 'sm',
                        });
                        modalInstance.result.then(
                            function (message) {
                                if (message === 'yes') {
                                    buildfire.userData.delete(
                                        review.id,
                                        'AppRatings2',
                                        review.userToken,
                                        function (err, result) {
                                            if (err)
                                                console.log(
                                                    'Error occured while deleting review:',
                                                    err
                                                );
                                            else {
                                                $scope.$digest();
                                                $location.path('/');
                                                buildfire.messaging.sendMessageToWidget(
                                                    {
                                                        scope: 'removeReview',
                                                        review: review,
                                                    }
                                                );
                                                $scope.$apply();
                                            }
                                        }
                                    );
                                }
                            },
                            function (data) {
                                //do something on cancel
                            }
                        );
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

