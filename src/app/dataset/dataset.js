'use strict';

var datasets = [{
  name: 'CreepingAlc',
  url: 'data/ca-open-data-processed.json',
  id: 'ca'
}];

function getNameMap(dataschema) {
  return dataschema.reduce(function(m, field) {
    m[field.name] = field;
    return m;
  }, {});
}

angular.module('polestar')
  .factory('Dataset', function($http, Alerts, _, Papa, dl, vl, consts) {
    var Dataset = {};

    var countField = vl.field.count();

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[0];
    Dataset.dataschema = [];
    Dataset.dataschema.byName = {};
    Dataset.stats = {};
    Dataset.type = undefined;

    // TODO move these to constant to a universal vlui constant file
    Dataset.typeNames = {
      O: 'text',
      Q: 'number',
      T: 'time',
      G: 'geo'
    };

    Dataset.fieldOrder = vl.field.order.typeThenName;
    Dataset.getSchema = function(data, stats, order) {
      var types = dl.read.types(data),
        schema = _.reduce(types, function(s, type, name){
          s.push({name: name, type: vl.data.types[type]});
          return s;
        }, []);

      schema = dl.stablesort(schema, order || vl.field.order.typeThenName, vl.field.order.name);

      if (consts.addCount) {
        schema.push(countField);
      }

      schema.forEach(function(field) {
        // if fewer than 2% of values or unique, assume the field to be ordinal,
        // or <= 7 unique values
        var profile = stats[field.name];
        if (profile !== undefined && (field.type === 'Q' && profile.distinct <= 20 &&
              (profile.distinct < (profile.count - profile.numNulls)/50 || profile.distinct <= 7))) {
          field.type = 'O';
        }
      });
      return schema;
    };

    Dataset.getStats = function(data) {
      // TODO add sampling back here, but that's less important for now
      var summary = dl.summary(data);

      return summary.reduce(function(s, profile) {
        s[profile.field] = profile;
        return s;
      }, {count: data.length});
    };

    // update the schema and stats
    Dataset.update = function(dataset) {
      return $http.get(dataset.url, {cache: true}).then(function(response) {
        // first see whether the data is JSON, otherwise try to parse CSV
        if (_.isObject(response.data)) {
           Dataset.data = response.data;
           Dataset.type = 'json';
        } else {
           var result = Papa.parse(response.data, {
            dynamicTyping: true,
            header: true
          });

          if (result.errors.length === 0) {
            Dataset.data = result.data;
            Dataset.type = 'csv';
          } else {
            _.each(result.errors, function(err) {
              Alerts.add(err.message, 2000);
            });
            return;
          }
        }

        Dataset.stats = Dataset.getStats(Dataset.data);
        Dataset.dataschema = Dataset.getSchema(Dataset.data, Dataset.stats);
        Dataset.dataschema.byName = getNameMap(Dataset.dataschema);
      });
    };

    Dataset.add = function(dataset) {
      if (!dataset.id) {
        dataset.id = dataset.url;
      }
      datasets.push(dataset);
    };

    return Dataset;
  });
