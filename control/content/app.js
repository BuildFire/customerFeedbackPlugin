'use strict';

(function (angular) {
    angular.module('customerFeedbackPluginContent', ['ngRoute', 'ui.tinymce', 'ui.bootstrap', 'ngRateIt', 'infinite-scroll'])
        //injected ngRoute for routing
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider
                .when('/', {
                    templateUrl: 'templates/home.html',
                    controllerAs: 'ContentHome',
                    controller: 'ContentHomeCtrl'
                })
                .when('/chat', {
                    templateUrl: 'templates/chat.html',
                    controllerAs: 'ContentChat',
                    controller: 'ContentChatCtrl'
                })
                .when('/chat/:encodedReview', {
                    templateUrl: 'templates/chat.html',
                    controllerAs: 'ContentChat',
                    controller: 'ContentChatCtrl'
                })
                .otherwise('/');
        }])
        .filter('getImageUrl', ['Buildfire', function (Buildfire) {
            return function (url, width, height, type) {
                if (type == 'resize')
                    return Buildfire.imageLib.resizeImage(url, {
                        width: width,
                        height: height
                    });
                else
                    return Buildfire.imageLib.cropImage(url, {
                        width: width,
                        height: height
                    });
            }
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
        .directive("loadImage", [function () {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    element.attr("src", "../../../../styles/media/holder-" + attrs.loadImage + ".gif");

                    var elem = $("<img>");
                    elem[0].onload = function () {
                        element.attr("src", attrs.finalSrc);
                        elem.remove();
                    };
                    elem.attr("src", attrs.finalSrc);
                }
            };
        }])
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
        }]);
})(window.angular);