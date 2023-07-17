'use strict';

(function (angular, buildfire) {
  angular.module('customerFeedbackPluginWidget', ['ngRoute', 'ngTouch', 'ngRateIt', 'infinite-scroll', 'ngAnimate'])
  .run(['$rootScope', function ($rootScope) {
        let stringsKeys=[
            'addReview.leaveYourFeedback',
            'addReview.yourRating',
            'addReview.writeANote',
            'addReview.submitReviewButton',
            'addReview.dialogSave',
            'addReview.dialogCancel',
            'reviews.oneStarRating',
            'reviews.twoStarsRating',
            'reviews.threeStarsRating',
            'reviews.fourStarsRating',
            'reviews.fiveStarsRating',
            'addReviewMessage.typeYourMessage',
            'addReviewMessage.dialogSave',
            'addReviewMessage.dialogCancel',
        ];
            
        $rootScope.state = {
            strings:{},
            dynamicBoxShadow:null,
            isTitleBarVisible:false,
        };
        
        getStrings($rootScope,stringsKeys);

        buildfire.appearance.titlebar.isVisible(null, (err, isVisible) => {
            if (err) {
                console.error(err);
                return;
            }
            if(!isVisible){
                $rootScope.state.isTitleBarVisible = true;
            }
        });
        
        $rootScope.state.dynamicBoxShadow = setBoxShadow();
    }])
    .config(['$routeProvider', '$compileProvider', function ($routeProvider, $compileProvider) {

      /**
       * To make href urls safe on mobile
       */
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|cdvfile|file):/);
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
                          }
                          else if (type === 'POPALL') {
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
      .directive('backImg', ["$rootScope", function ($rootScope) {
          return function (scope, element, attrs) {
              attrs.$observe('backImg', function (value) {
                  var img = '';
                  if (value) {
                      buildfire.imageLib.local.cropImage(value, {
                          width: $rootScope.deviceWidth,
                          height: $rootScope.deviceHeight
                      }, function (err, imgUrl) {
                          if (imgUrl) {
                              img = imgUrl;
                              element.attr("style", 'background:url(' + img + ') !important; background-size: cover !important;');
                          } else {
                              img = '';
                              element.attr("style", 'background-color:white');
                              element.css({
                                  'background-size': 'cover'
                              });
                          }
                      });
                  }
                  else {
                      img = "";
                      element.attr("style", 'background-color:white');
                      element.css({
                          'background-size': 'cover'
                      });
                  }
              });
          };
      }])
      .directive("loadImage", function () {
          return {
              restrict: 'A',
              link: function (scope, element, attrs) {
                  element.attr("src", "../../../styles/media/holder-" + attrs.loadImage + ".gif");

                  attrs.$observe('finalSrc', function() {
                      var _img = attrs.finalSrc;

                      if (attrs.cropType == 'resize') {
                          buildfire.imageLib.local.resizeImage(_img, {
                              width: attrs.cropWidth,
                              height: attrs.cropHeight
                          }, function (err, imgUrl) {
                              _img = imgUrl;
                              replaceImg(_img);
                          });
                      } else {
                          buildfire.imageLib.local.cropImage(_img, {
                              width: attrs.cropWidth,
                              height: attrs.cropHeight
                          }, function (err, imgUrl) {
                              _img = imgUrl;
                              replaceImg(_img);
                          });
                      }
                  });

                  function replaceImg(finalSrc) {
                      var elem = $("<img>");
                      elem[0].onload = function () {
                          element.attr("src", finalSrc);
                          elem.remove();
                      };
                      elem.attr("src", finalSrc);
                  }
              }
          };
      })
      .run(['ViewStack', function (ViewStack) {
          buildfire.navigation.onBackButtonClick = function () {
              if (ViewStack.hasViews()) {
                  ViewStack.pop();
              } else {
                  buildfire.navigation._goBackOne();
              }
          };
      }])
      .filter('unique', function () {
          return function (collection, keyname) {
              var output = [],
                  keys = [];
              angular.forEach(collection, function (item) {
                  var key = item[keyname];
                  if (keys.indexOf(key) === -1) {
                      keys.push(key);
                      output.push(item);
                  }
              });
              return output;
          };
      })
      .filter('newLine', ['$sce', function ($sce) {
          return function (html) {
              if (html) {
                  html = html.replace(/\n/g, '<br />');
                  return $sce.trustAsHtml(html);
              }
              else {
                  return "";
              }
          };
      }]).directive('starRating', starRating)
    .directive('backImg', ["$filter", "$rootScope", function ($filter, $rootScope) {
      return function (scope, element, attrs) {
        attrs.$observe('backImg', function (value) {
          var img = '';
          if (value) {
            img = $filter("cropImage")(value, $rootScope.deviceWidth, $rootScope.deviceHeight, true);
            element.attr("style", 'background:url(' + img + ') !important; background-size:cover !important;');
          }
          else {
            img = "";
            element.attr("style", 'background-color:white;');
          }
        });
      };
    }]).directive("averageStarRating", function() {
      return {
        restrict : "EA",
        template : "<div class='average-rating-container'>" +
        "  <ul class='rating background' class='readonly'>" +
        "    <li ng-repeat='star in stars' class='star' style='opacity:0.5;'>" +
        "      <i class='icon-star-full'>&#9733;</i>" + //&#9733
        "    </li>" +
        "  </ul>" +
        "  <ul class='rating foreground' class='readonly' style='width:{{filledInStarsContainerWidth}}%'>" +
        "    <li ng-repeat='star in stars' class='star filled'>" +
        "      <i class='icon-star-full'>&#9733;</i>" + //&#9733
        "    </li>" +
        "  </ul>" +
        "</div>",
        scope : {
          averageRatingValue : "=ngModel",
          max : "=?" //optional: default is 5
        },
        link : function(scope, elem, attrs) {
          if (scope.max == undefined) { scope.max = 5; }
          function updateStars() {
            scope.stars = [];
            for (var i = 0; i < scope.max; i++) {
              scope.stars.push({});
            }
            var starContainerMaxWidth = 100; //%
            scope.filledInStarsContainerWidth = scope.averageRatingValue / scope.max * starContainerMaxWidth;
          };
          scope.$watch("averageRatingValue", function(oldVal, newVal) {
            if (newVal) { updateStars(); }
          });
        }
      };
    });

    const getStrings = ($rootScope,stringsKeys)=>{
        stringsKeys.forEach((key)=>{
            buildfire.language.get({stringKey:key}, (err, result) => {
            if (err) return console.error("Error while retrieving string value", err);
                let [section, property] = key.split('.');
                if (!$rootScope.state.strings[section]) {
                    $rootScope.state.strings[section] = {};
                }
                $rootScope.state.strings[section][property] = result;
            });
            
        });
    }
    
    const setBoxShadow = ()=>{
        return `rgba(${colorToRGBA(
            getComputedStyle(document.documentElement)
            .getPropertyValue('--bf-theme-body-text')
            .trim(),
            0.2
        )}) 0 2px 8px`;
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
  function starRating() {
    return {
      restrict: 'EA',
      template:
      '<ul class="star-rating" ng-class="{readonly: readonly}">' +
      '  <li ng-repeat="star in stars" class="star" ng-class="{filled: star.filled}" ng-click="toggle($index)">' +
      '    <i class="icon-star-full">&#9733;</i>' + // or &#9733
      '  </li>' +
      '</ul>',
      scope: {
        ratingValue: '=ngModel',
        max: '=?', // optional (default is 5)
        onRatingSelect: '&?',
        readonly: '=?'
      },
      link: function(scope, element, attributes) {
        if (scope.max == undefined) {
          scope.max = 5;
        }
        function updateStars() {
          scope.stars = [];
          for (var i = 0; i < scope.max; i++) {
            scope.stars.push({
              filled: i < scope.ratingValue
            });
          }
        };
        scope.toggle = function(index) {
          if (scope.readonly == undefined || scope.readonly === false){
            scope.ratingValue = index + 1;
            scope.onRatingSelect({
              rating: index + 1
            });
          }
        };
        scope.$watch('ratingValue', function(oldValue, newValue) {
          if (newValue) {
            updateStars();
          }
        });
      }
    };
  };
})(window.angular, window.buildfire);
