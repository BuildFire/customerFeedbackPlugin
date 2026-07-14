'use strict';

(function (angular, buildfire) {
  angular.module('customerFeedbackPluginContent')
    .provider('Buildfire', [function () {
      var Buildfire = this;
      Buildfire.$get = function () {
        return buildfire
      };
      return Buildfire;
    }])
    .factory("DataStore", ['Buildfire', '$q', 'STATUS_CODE', 'STATUS_MESSAGES', function (Buildfire, $q, STATUS_CODE, STATUS_MESSAGES) {
      return {
        get: function (_tagName) {
          var deferred = $q.defer();
          Buildfire.datastore.get(_tagName, function (err, result) {
            if (!result || !result.data || !result.data.introduction || Object.keys(result.data).length === 0) {
              result.data.introduction = '';
              buildfire.datastore.save(result, _tagName);
            }
            if (err) {
              return deferred.reject(err);
            } else if (result) {
              return deferred.resolve(result);
            }
          });
          return deferred.promise;
        },
        save: function (_item, _tagName) {
          var deferred = $q.defer();
          if (typeof _item == 'undefined') {
            return deferred.reject(new Error({
              code: STATUS_CODE.UNDEFINED_DATA,
              message: STATUS_MESSAGES.UNDEFINED_DATA
            }));
          }
          Buildfire.datastore.save(_item, _tagName, function (err, result) {
            if (err) {
              return deferred.reject(err);
            } else if (result) {
              return deferred.resolve(result);
            }
          });
          return deferred.promise;
        }
      }
    }])
    .factory("Reviews", ['Buildfire', '$q', 'TAG_NAME', function (Buildfire, $q, TAG_NAME) {
      /*
       * Aggregation pipeline used to compute the total number of reviews and the
       * average rating across the whole collection in a single call.
       */
      var SUMMARY_PIPELINE = [
        { $match: { "_buildfire.index.string1": { $exists: false } } },
        {
          $project: {
            // convert the starRating field to a number so that we can compute the average
            starRating: { $toDouble: "$starRating" },
          }
        },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            avgRating: { $avg: "$starRating" }
          }
        }
      ];

      return {
        /*
         * Paginated search over the reviews collection.
         * Resolves with the array of matching review records.
         */
        search: function (options) {
          var deferred = $q.defer();
          Buildfire.userData.search(options || {}, TAG_NAME.REVIEWS, function (err, results) {
            if (err) {
              return deferred.reject(err);
            }
            return deferred.resolve(results);
          });
          return deferred.promise;
        },
        /*
         * Resolves with { totalReviews, avgRating } aggregated over the whole
         * collection, defaulting both to 0 when there are no reviews.
         */
        getSummary: function () {
          var deferred = $q.defer();
          Buildfire.userData.aggregate({ pipelineStages: SUMMARY_PIPELINE }, TAG_NAME.REVIEWS, function (err, result) {
            if (err) {
              return deferred.reject(err);
            }
            var summary = result && result[0];
            return deferred.resolve({
              totalReviews: summary ? summary.totalReviews : 0,
              avgRating: summary ? summary.avgRating : 0
            });
          });
          return deferred.promise;
        },
        /*
         * Deletes a single review by id (scoped to the owning user token).
         */
        remove: function (id, userToken) {
          var deferred = $q.defer();
          Buildfire.userData.delete(id, TAG_NAME.REVIEWS, userToken, function (err, result) {
            if (err) {
              return deferred.reject(err);
            }
            return deferred.resolve(result);
          });
          return deferred.promise;
        }
      };
    }])
    .factory("Comments", ['Buildfire', '$q', 'TAG_NAME', function (Buildfire, $q, TAG_NAME) {
      /*
       * Comments live in a per-review collection keyed by the review's user token,
       * e.g. "chatData-<userToken>".
       */
      function tagFor(userToken) {
        return TAG_NAME.CHAT_PREFIX + userToken;
      }

      return {
        /*
         * Paginated search over a review's comments.
         * Resolves with the raw { result, totalRecord } object returned by userData.
         */
        search: function (userToken, options) {
          var deferred = $q.defer();
          Buildfire.userData.search(options || {}, tagFor(userToken), function (err, results) {
            if (err) {
              return deferred.reject(err);
            }
            return deferred.resolve(results);
          });
          return deferred.promise;
        },
        /*
         * Resolves with the total number of comments for a review, defaulting to 0.
         */
        getCount: function (userToken) {
          var deferred = $q.defer();
          Buildfire.userData.search({ recordCount: true }, tagFor(userToken), function (err, results) {
            if (err) {
              return deferred.reject(err);
            }
            return deferred.resolve(results ? results.totalRecord : 0);
          });
          return deferred.promise;
        },
        /*
         * Inserts a new comment for a review. Resolves with the created record.
         */
        insert: function (userToken, message) {
          var deferred = $q.defer();
          Buildfire.userData.insert(message, tagFor(userToken), userToken, function (err, result) {
            if (err) {
              return deferred.reject(err);
            }
            return deferred.resolve(result);
          });
          return deferred.promise;
        }
      };
    }]);
})(window.angular, window.buildfire);