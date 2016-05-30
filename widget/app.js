'use strict';

(function (angular, buildfire) {
  angular.module('customerFeedbackPluginWidget', ['ngRoute', 'ngRateIt', 'infinite-scroll'])
    .config(['$routeProvider', '$compileProvider', function ($routeProvider, $compileProvider) {

      /**
       * To make href urls safe on mobile
       */
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|cdvfile|file):/);

        /*$routeProvider
            .when('/', {
              templateUrl: 'templates/home.html',
              controllerAs: 'WidgetHome',
              controller: 'WidgetHomeCtrl'
            }).when('/wall', {
              templateUrl: 'templates/wall.html',
              controllerAs: 'WidgetWall',
              controller: 'WidgetWallCtrl'
            }).when('/submit/:lastReviewCount?', {
              templateUrl: 'templates/submit.html',
              controllerAs: 'WidgetSubmit',
              controller: 'WidgetSubmitCtrl'
            })
            .otherwise('/');*/
      }])
      .filter('cropImage', [function () {
          return function (url, width, height, noDefault) {
              if (noDefault) {
                  if (!url)
                      return '';
              }
              return buildfire.imageLib.cropImage(url, {
                  width: width,
                  height: height
              });
          };
      }])
      .run(['$rootScope', '$location', function ($rootScope, $location) {
          buildfire.navigation.onBackButtonClick = function () {
             // $location.path('/')
               if($location.path()=='/submit')
               {
                   $location.path('/wall')
               }else{
                   $location.path('/')
               }
              console.log("=================",$location.path())
              $rootScope.$apply();


          };
          //buildfire.history.onPop(function(breadcrumb) {
          //   console.log("=====================",breadcrumb)
          //});

      }])
      /*.directive("buildFireCarousel", ["$rootScope", function ($rootScope) {
          return {
              restrict: 'A',
              link: function (scope, elem, attrs) {
                  $rootScope.$broadcast("Carousel:LOADED");
              }
          };
      }])*/
      .directive("viewSwitcher", ["ViewStack", "$rootScope", '$compile', "$templateCache",
          function (ViewStack, $rootScope, $compile, $templateCache) {
              return {
                  restrict: 'AE',
                  link: function (scope, elem, attrs) {
                      var views = 0;
                      manageDisplay();
                      $rootScope.$on('VIEW_CHANGED', function (e, type, view) {
                          if (type === 'PUSH') {
                              var newScope = $rootScope.$new();
                              newScope.currentItemListLayout = "templates/" + view.template + ".html";

                              var _newView = '<div  id="' + view.template + '" ><div class="slide content" data-back-img="{{backgroundImage}}" ng-if="currentItemListLayout" ng-include="currentItemListLayout"></div></div>';
                              if (view.params && view.params.controller) {
                                  _newView = '<div id="' + view.template + '" ><div class="slide content" data-back-img="{{backgroundImage}}" ng-if="currentItemListLayout" ng-include="currentItemListLayout" ng-controller="' + view.params.controller + '" ></div></div>';
                              }
                              var parTpl = $compile(_newView)(newScope);
                              if (view.params && view.params.shouldUpdateTemplate) {
                                  newScope.$on("ITEM_LIST_LAYOUT_CHANGED", function (evt, layout, needDigest) {
                                      newScope.currentItemListLayout = "templates/" + layout + ".html";
                                      if (needDigest) {
                                          newScope.$digest();
                                      }
                                  });
                              }
                              $(elem).append(parTpl);
                              views++;

                          } else if (type === 'POP') {
                              var _elToRemove = $(elem).find('#' + view.template),
                                  _child = _elToRemove.children("div").eq(0);

                              _child.addClass("ng-leave ng-leave-active");
                              _child.one("webkitTransitionEnd transitionend oTransitionEnd", function (e) {
                                  _elToRemove.remove();
                                  views--;
                              });

                              //$(elem).find('#' + view.template).remove();
                          }
                          else if (type === 'POPALL') {
                              console.log(view);
                              angular.forEach(view, function (value, key) {
                                  $(elem).find('#' + value.template).remove();
                              });
                              views = 0;
                          }
                          manageDisplay();
                      });

                      function manageDisplay() {
                          if (views) {
                              $(elem).removeClass("ng-hide");
                          } else {
                              $(elem).addClass("ng-hide");
                          }
                      }

                  }
              };
          }])
      .run(['ViewStack', function (ViewStack) {
          buildfire.navigation.onBackButtonClick = function () {
              if (ViewStack.hasViews()) {
                  ViewStack.pop();
              } else {
                  buildfire.navigation._goBackOne();
              }
          };
      }]);
})(window.angular, window.buildfire);