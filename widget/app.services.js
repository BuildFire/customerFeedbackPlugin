'use strict';

(function (angular, buildfire) {
    angular.module('customerFeedbackPluginWidget')
        .provider('Buildfire', [function () {
            var Buildfire = this;
            Buildfire.$get = function () {
                return buildfire
            };
            return Buildfire;
        }])
        .factory("DataStore", ['Buildfire', '$q', 'STATUS_CODE', 'STATUS_MESSAGES', function (Buildfire, $q, STATUS_CODE, STATUS_MESSAGES) {
            var onUpdateListeners = [];
            return {
                get: function (_tagName) {
                    var deferred = $q.defer();
                    Buildfire.datastore.get(_tagName, function (err, result) {
                        if (err) {
                            return deferred.reject(err);
                        } else if (result) {
                            return deferred.resolve(result);
                        }
                    });
                    return deferred.promise;
                },
                onUpdate: function () {
                    var deferred = $q.defer();
                    var onUpdateFn = Buildfire.datastore.onUpdate(function (event) {
                        if (!event) {
                            return deferred.notify(new Error({
                                code: STATUS_CODE.UNDEFINED_DATA,
                                message: STATUS_MESSAGES.UNDEFINED_DATA
                            }), true);
                        } else {
                            return deferred.notify(event);
                        }
                    }, true);
                    onUpdateListeners.push(onUpdateFn);
                    return deferred.promise;
                },
                clearListener: function () {
                    onUpdateListeners.forEach(function (listner) {
                        listner.clear();
                    });
                    onUpdateListeners = [];
                }
            }
        }])
        .factory('ViewStack', ['$rootScope', function ($rootScope) {
            var views = [];
            var viewMap = {};
            return {
                push: function (view) {
                    if (viewMap[view.template]) {
                        this.pop();
                    }
                    else {
                        viewMap[view.template] = 1;
                        views.push(view);
                        $rootScope.$broadcast('VIEW_CHANGED', 'PUSH', view);
                        buildfire.history.push(view.template,{showLabelInTitlebar: false});
                    }
                    return view;
                },
                pop: function () {
                    $rootScope.$broadcast('BEFORE_POP', views[views.length - 1]);
                    var view = views.pop();
                    delete viewMap[view.template];
                    $rootScope.$broadcast('VIEW_CHANGED', 'POP', view);
                    buildfire.history.pop();
                    return view;
                },
                hasViews: function () {
                    return !!views.length;
                },
                getCurrentView: function () {
                    return views.length && views[views.length - 1] || {};
                },
                popAllViews: function () {
                    $rootScope.$broadcast('VIEW_CHANGED', 'POPALL', views);
                    views = [];
                    viewMap = {};
                }
            };
        }]);
})(window.angular, window.buildfire);