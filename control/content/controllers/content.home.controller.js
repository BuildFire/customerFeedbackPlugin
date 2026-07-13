'use strict';

(function (angular) {
  angular
    .module('customerFeedbackPluginContent')
    .controller('ContentHomeCtrl', ['$scope', '$location', 'Buildfire', 'DataStore', 'TAG_NAME', 'STATUS_CODE', 'EVENTS','$modal', '$rootScope',
      function ($scope, $location, Buildfire, DataStore, TAG_NAME, STATUS_CODE, EVENTS,$modal, $rootScope) {
        var _data = {
          "design": {
            "backgroundImage": ""
          }
        };

        var ContentHome = this;
        var skip = 0;
        var limit = 15;
        var inProgress = false;
          var uniqueTokens = [];
          var uniqueReviews = [];
          var avgRating = 0;
          var elemCount = 0;
        ContentHome.avgRating = 0;
        ContentHome.totalReviews = 0;
        ContentHome.masterData = null;
        ContentHome.showChat = false;
        ContentHome.noMore = false;
        ContentHome.reviews = [];
        ContentHome.numberOfCommentsList =[];

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
          Buildfire.userData.aggregate(
            {
              pipelineStages: [
                {
                  $match: {
                    "_buildfire.index.string1": { $exists: false }
                  }
                },
                {
                  "$group": {
                      "_id": null,
                      "totalReviews": { "$sum": 1 },
                      "avgRating": {
                          "$avg": "$starRating"
                      }
                  }
               }
              ]
            },
            'AppRatings2',
            function (err, result) {
              if (err) return console.error('Error aggregating reviews:', JSON.stringify(err));
              var summary = result && result[0];
              ContentHome.totalReviews = summary ? summary.totalReviews : 0;
              ContentHome.avgRating = summary ? summary.avgRating : 0;
              if (!$scope.$$phase) $scope.$apply();
            }
          );
        };

        ContentHome.loadMoreItems = function () {
            if (inProgress) return;
            inProgress = true;
            buildfire.userData.search({skip: skip, limit: limit}, 'AppRatings2', function (err, results) {
                inProgress = false;
                if (err) console.error("++++++++++++++ctrlerr",JSON.stringify(err));
                else {
                    ContentHome.reviews = ContentHome.reviews.concat(results);
                    results.sort(function(a, b) {
                        return new Date(b.data.addedDate) - new Date(a.data.addedDate);
                    });
                    if (results.length < limit ) {
                        ContentHome.noMore = true;
                    }
                    let promises = [];
                    results.forEach(function (result) {
                        elemCount = elemCount + 1;
                        avgRating = avgRating + parseInt(result.data.starRating);
                        if (uniqueTokens.indexOf(result.userToken) == -1) {
                          uniqueTokens.push(result.userToken);
                          uniqueReviews.push(result);
                          promises.push(getCommentsCount(result.userToken));
                        }
                    });
                    
                    skip = skip + results.length;
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
                    
                }
            });
        };

        const getCommentsCount = function (userToken) {
          return new Promise((resolve, reject) => {
            buildfire.userData.search({ recordCount:true }, 'chatData-' + userToken, function (err, results) {
              if (err) {
                reject("Error", JSON.stringify(err));
              }
              else {
                  resolve({userToken, numberOfComments: results.totalRecord});
              }
          });
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
                              ContentHome.reviews.push(event.data);
                              let reviewItem = ContentHome.numberOfCommentsList.find(
                                (item) =>
                                item.userToken === event.data.userToken);
                                if(reviewItem) {
                                  event.data.numberOfComments = reviewItem.numberOfComments
                                }; 
                              if (uniqueTokens.indexOf(event.data.userToken) == -1) {
                                  uniqueTokens.push(event.data.userToken);
                                  uniqueReviews.push(event.data);
                              }
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
                buildfire.userData.delete(review.id, 'AppRatings2',review.userToken, function (err, result) {
                  if(err)
                  console.log("Error occured while deleting review:", err);
                  else{
                    ContentHome.reviews.pop();
                    $scope.$digest();
                    buildfire.messaging.sendMessageToWidget({
                      scope: "removeReview",
                      review: review,
                    });
                  }
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
