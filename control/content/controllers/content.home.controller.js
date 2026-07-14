'use strict';

(function (angular) {
  angular
    .module('customerFeedbackPluginContent')
    .controller('ContentHomeCtrl', ['$scope', '$location', 'Buildfire', 'DataStore', 'TAG_NAME', 'STATUS_CODE', 'EVENTS','$modal', '$rootScope', 'Reviews', 'Comments',
      function ($scope, $location, Buildfire, DataStore, TAG_NAME, STATUS_CODE, EVENTS,$modal, $rootScope, Reviews, Comments) {
        var _data = {
          "design": {
            "backgroundImage": ""
          }
        };

        var ContentHome = this;
        var skip = 0;
        var limit = 10;
          var uniqueTokens = [];
          var uniqueReviews = [];
        ContentHome.avgRating = 0;
        ContentHome.totalReviews = 0;
        ContentHome.masterData = null;
        ContentHome.showChat = false;
        ContentHome.noMore = false;
        ContentHome.reviews = [];
        ContentHome.numberOfCommentsList =[];
        ContentHome.isFetching = false;

        updateMasterItem(_data);

        function updateMasterItem(data) {
          ContentHome.masterData = angular.copy(data);
        }

        function isUnchanged(data) {
          return angular.equals(data, ContentHome.masterData);
        }

        /*
         * Go pull any previously saved data
         * */
        var init = function () {
          var success = function (result) {
              console.info('init success result:', result);
              ContentHome.data = result.data;
              if (!ContentHome.data || (Object.keys(ContentHome.data).length === 0 && JSON.stringify(ContentHome.data) === JSON.stringify({}))) {
                ContentHome.data = angular.copy(_data);
              }
              updateMasterItem(ContentHome.data);
              if (tmrDelay)clearTimeout(tmrDelay);
            }
            , error = function (err) {
              if (err && err.code !== STATUS_CODE.NOT_FOUND) {
                console.error('Error while getting data', err);
                if (tmrDelay)clearTimeout(tmrDelay);
              }
            };
            DataStore.get(TAG_NAME.FEEDBACK_APP_INFO).then(success, error);
            getTotalReviewsAndAverageCount();
            ContentHome.loadMoreItems();
        };

        const getTotalReviewsAndAverageCount = function () {
          Reviews.getSummary().then(function (summary) {
            ContentHome.totalReviews = summary.totalReviews;
            ContentHome.avgRating = summary.avgRating;
          }, function (err) {
            console.error('Error aggregating reviews:', JSON.stringify(err));
          });
        };

        ContentHome.loadMoreItems = function () {
            if (ContentHome.isFetching) return;
            ContentHome.isFetching = true;
            Reviews.search({skip: skip, limit: limit, sort: {addedDate: -1}}).then(function (results) {
                ContentHome.reviews = ContentHome.reviews.concat(results);
                if (results.length < limit ) {
                    ContentHome.noMore = true;
                }
                let promises = [];
                results.forEach(function (result) {
                    if (uniqueTokens.indexOf(result.userToken) == -1) {
                      uniqueTokens.push(result.userToken);
                      uniqueReviews.push(result);
                      promises.push(getCommentsCount(result.userToken));
                    }
                });

                skip = skip + results.length;
                ContentHome.isFetching = false;
                Promise.all(promises).then((res) => {
                  ContentHome.numberOfCommentsList.push(...res);
                }).then((res)=>{
                  results.forEach(function (result) {
                    let numberOfComments =
                    ContentHome.numberOfCommentsList.find(
                        (item) =>
                            item.userToken === result.userToken
                    )?.numberOfComments || 0;
                    ContentHome.reviews.forEach((item) => {
                        if (item.userToken === result.userToken) {
                            item.numberOfComments = numberOfComments;
                        }
                    });
                  });
                }).then(()=>{
                  $scope.$apply();
                });
            }, function (err) {
                console.error("++++++++++++++ctrlerr",JSON.stringify(err));
                ContentHome.isFetching = false;
            });
        };

        const getCommentsCount = function (userToken) {
          return Comments.getCount(userToken).then(function (numberOfComments) {
            return { userToken: userToken, numberOfComments: numberOfComments };
          });
        };

        /*
         * Call the datastore to save the data object
         */
        var saveData = function (newObj, tag) {
          if (typeof newObj === 'undefined') {
            return;
          }
          var success = function (result) {
              console.info('Saved data result: ', result);
              updateMasterItem(newObj);
            }
            , error = function (err) {
              console.error('Error while saving data : ', err);
            };
          DataStore.save(newObj, tag).then(success, error);
        };

        /*
         * create an artificial delay so api isnt called on every character entered
         * */
        var tmrDelay = null;

        var saveDataWithDelay = function (newObj) {
          if (newObj) {
            if (isUnchanged(newObj)) {
              return;
            }
            if (tmrDelay) {
              clearTimeout(tmrDelay);
            }
            tmrDelay = setTimeout(function () {
              saveData(JSON.parse(angular.toJson(newObj)), TAG_NAME.FEEDBACK_APP_INFO);
            }, 500);
          }
        };

          ContentHome.getUrl = function (review) {
              $rootScope.state.currentReview = review;
              ContentHome.showChat = true;
              $location.path('/chat/' + review.userToken);
          };

          function resetState() {
            skip = 0;
            ContentHome.reviews = [];
            uniqueTokens = [];
            uniqueReviews = [];
            ContentHome.numberOfCommentsList = [];
          }

        /*
         * watch for changes in data and trigger the saveDataWithDelay function on change
         * */
        $scope.$watch(function () {
          return ContentHome.data;
        }, saveDataWithDelay, true);

          Buildfire.messaging.onReceivedMessage = function (event) {
              if (event) {
                  switch (event.name) {
                      case EVENTS.REVIEW_CREATED :
                          if (event.data) {
                              resetState();
                              ContentHome.loadMoreItems();
                              getTotalReviewsAndAverageCount();
                          }
                          break;
                      case EVENTS.CHAT_ADDED :
                          if(event.data){
                            let reviewItem = ContentHome.reviews.find(
                              (item) =>
                              item.userToken === event.data.data.id);
                              if(reviewItem) reviewItem.numberOfComments +=1; 
                            }
                          break;   
                      default :
                          break;
                  }
                  if (!$scope.$$phase)
                      $scope.$digest();
              }
          };

        ContentHome.deleteReview = function (review, index) {
          if(review && review.id && review.userToken){
            var modalInstance = $modal.open({
              templateUrl: 'templates/deleteReviewModal.html',
              controller: 'RemovePopupCtrl',
              controllerAs: 'RemovePopup',
              size: 'sm'
            });
            modalInstance.result.then(function (message) {
              if (message === 'yes') {
                Reviews.remove(review.id, review.userToken).then(function (result) {
                  ContentHome.reviews.splice(index, 1);
                  buildfire.messaging.sendMessageToWidget({
                    scope: "removeReview",
                    review: review,
                  });
                  getTotalReviewsAndAverageCount();
                }, function (err) {
                  console.log("Error occured while deleting review:", err);
                });
              }
            }, function (data) {
              //do something on cancel
            });
          }
        };

        init();
      }]);
})(window.angular);
