var _ = require('lodash');
var da = require('distribute-array')
var sia = require('../')
var sis = require('search-index-searcher')
var test = require('tape');
var async = require('async');

var resultForStarUSA = [ '287', '510', '998', '997', '996', '995', '994', '993', '992', '991' ]

test('simple indexing test', function (t) {
  var batch = require('../node_modules/reuters-21578-json/data/full/reuters-000.json')
  t.plan(6);
  t.equal(batch.length, 1000);
  sia({indexPath: 'test/sandbox/simpleIndexing'}, function(err, indexer) {
    t.error(err)
    sis(indexer.getOptions(), function(err, searcher) {
      t.error(err)
      indexer.add(batch, {}, function(err) {
        t.error(err)
        var q = {}
        q.query = {'*': ['usa']}
        searcher.search(q, function (err, searchResults) {
          t.error(err)
          t.deepLooseEqual(_.map(searchResults.hits, 'id').slice(0,10), resultForStarUSA)
        })
      })
    })
  })
})

test('concurrancy test', function (t) {
  var startTime = Date.now()
  t.plan(18)
  sia({indexPath: 'test/sandbox/concurrentIndexing'}, function(err, indexer) {
    t.error(err)
    sis(indexer.getOptions(), function(err, searcher) {
      t.error(err)
      var batchData = da(require('../node_modules/reuters-21578-json/data/full/reuters-000.json'), 10)
      t.equal(batchData.length, 10);
      async.each(batchData, function(batch, callback) {
        console.log('task submitted')
        indexer.add(batch, {}, function(err) {
          if (!err) t.pass('no errorness')
          callback();
        })    
      }, function(err) {
        var q = {}
        q.query = {'*': ['usa']} // TODO: add error message if this is
        //      not an array
        searcher.search(q, function (err, searchResults) {
          if (!err) t.pass('no errorness')
          t.deepLooseEqual(_.map(searchResults.hits, 'id').slice(0,10), resultForStarUSA)
        })
        indexer.getOptions().indexes.get('LAST-UPDATE-TIMESTAMP', function(err, val) {
          t.error(err)
          t.ok((val - startTime) > 0,
               'lastUpdateTimestamp seems reasonable (' + (val - startTime) + ')')
          t.ok((val - startTime) < 60000,
               'lastUpdateTimestamp seems reasonable (' + (val - startTime) + ')')
        })
      })
    })
  })
})
