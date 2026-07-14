'use strict';

(function (angular) {
    angular
        .module('customerFeedbackPluginContent')
        .controller('ContentChatCtrl', ['$scope','$rootScope', '$routeParams', '$location', '$filter', 'Buildfire', 'TAG_NAME', 'STATUS_CODE', 'DataStore','EVENTS', '$modal', 'Reviews', 'Comments',
            function ($scope, $rootScope, $routeParams, $location, $filter, Buildfire, TAG_NAME, STATUS_CODE, DataStore, EVENTS, $modal, Reviews, Comments) {
                var ContentChat = this;
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
                        Comments.search($routeParams.userToken, {skip: skip, limit: limit, recordCount:true}).then(function (comments) {
                            if (comments.result.length < limit) {
                                ContentChat.noMore = true;
                            }
                            ContentChat.chatMessageData = ContentChat.chatMessageData ? ContentChat.chatMessageData : [];
                            ContentChat.chatMessageData = ContentChat.chatMessageData.concat(comments.result);
                            ContentChat.chatMessageData = $filter('unique')(ContentChat.chatMessageData, 'id');
                            ContentChat.numberOfComments = comments.totalRecord;
                            skip = skip + comments.result.length;
                            ContentChat.waitAPICompletion = false;
                        }, function (err) {
                            console.error("Error", JSON.stringify(err));
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
                            Comments.insert($routeParams.userToken, ContentChat.chatMessageObj).then(function (result) {
                                ContentChat.chatMessageData.unshift(result);
                                buildfire.messaging.sendMessageToWidget({'name': EVENTS.CHAT_ADDED, 'data': result});
                                ContentChat.chatData = '';
                                ContentChat.numberOfComments+=1;
                            }, function (err) {
                                console.error("Error : ", JSON.stringify(err));
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
                                    Reviews.remove(review.id, review.userToken).then(
                                        function (result) {
                                            $location.path('/');
                                            buildfire.messaging.sendMessageToWidget(
                                                {
                                                    scope: 'removeReview',
                                                    review: review,
                                                }
                                            );
                                        },
                                        function (err) {
                                            console.log(
                                                'Error occured while deleting review:',
                                                err
                                            );
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

