'use strict';

(function (angular) {
  angular
    .module('customerFeedbackPluginDesign')
    .controller('DesignHomeCtrl', ['$scope','Buildfire','DataStore', 'TAG_NAMES',
      function ($scope, Buildfire, DataStore, TAG_NAMES) {
        var DesignHome = this;

        function init() {
          var feedBackInfo = {
            design: {
              backgroundImage: ''
            }
          };

          Buildfire.datastore.get(TAG_NAMES.FEEDBACK_APP_INFO, function (err, data) {
            if (err) {
              console.log('------------Error in Design of customer feedback plugin------------', err);
            }
            else if (data && data.data) {
              DesignHome.feedBackInfo = angular.copy(data.data);
              if (!DesignHome.feedBackInfo.design)
                DesignHome.feedBackInfo.design = {};
              if (DesignHome.feedBackInfo && DesignHome.feedBackInfo.design && DesignHome.feedBackInfo.design.backgroundImage) {
                DesignHome.background.loadbackground(DesignHome.feedBackInfo.design.backgroundImage);
              }
              if (!$scope.$$phase && !$scope.$root.$$phase) {
                $scope.$digest();
              }
            }
            else {
              DesignHome.feedBackInfo = feedBackInfo;
              console.info('------------------unable to load data---------------');
            }
          });
        }

        DesignHome.background = new Buildfire.components.images.thumbnail("#background");
        DesignHome.background.onChange = function (url) {
          DesignHome.feedBackInfo.design.backgroundImage = url;
          if (!$scope.$$phase && !$scope.$root.$$phase) {
            $scope.$apply();
          }
        };

        DesignHome.background.onDelete = function (url) {
          DesignHome.feedBackInfo.design.backgroundImage = "";
          if (!$scope.$$phase && !$scope.$root.$$phase) {
            $scope.$apply();
          }
        };
        init();

        /*watch the change event and update in database*/
        $scope.$watch(function () {
          return DesignHome.feedBackInfo;
        }, function (oldObj,newObj) {

          if (oldObj != newObj && newObj) {
            Buildfire.datastore.save(DesignHome.feedBackInfo, TAG_NAMES.FEEDBACK_APP_INFO, function (err, data) {
              if (err) {
                //return DesignHome.data = angular.copy(DesignHomeMaster);
              }
              else if (data) {
                //return DesignHomeMaster = data.obj;
                console.log("Updated Object:", newObj);
              }
              $scope.$digest();
            });
          }
        }, true);
      }]);
})(window.angular);
