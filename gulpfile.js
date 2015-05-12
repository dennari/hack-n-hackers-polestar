'use strict';

var gulp = require('gulp');
var fs = require('fs')
var through2 = require('through2')
var _ = require('lodash')
gulp.paths = {
  src: 'src',
  dist: 'dist',
  tmp: '.tmp',
  e2e: 'e2e'
};

require('require-dir')('./gulp');

gulp.task('default', ['clean'], function() {
  gulp.start('build');
});



var metadata = require('./src/data/alcoholism-metadata.json').tasks.reduce(function(c, i) {
	
	if(i.type !== "MULTISELECT") {

	c[i.id] = {
		id: i.id,
		title: parseTitle(i.question, i.id+"_", null, i.id),
		type: i.type,
		options: i.options.reduce(function(cc, ii){
			cc[ii.id] = parseTitle(ii.text)
			return cc;
		},{})
	};
	
	}
	return c;

}, {})
//console.log(metadata)

function parseTitle(t, prefix, postfix, id) {
	var fixed = {
		"23": "cryCountThreeYears",
		"15": "weeklyDrinks"
	}
	postfix = postfix ? postfix : ''
	prefix = prefix ? prefix : ''

	if(fixed[id]) {
		return fixed[id]
	}
  


	var max = 20;
	t = t.toLowerCase().replace(/\s+/g,'_');
	t = t.replace(/ä/g,'a');
	t = t.replace(/ö/g,'o');	
	t = t.replace(/[^a-z0-9_]*/g, '')
	if(t.length > max)
		t = t.substring(0,max)

	return prefix + t + postfix
}

function transform(i) {
	for(var qId in metadata) {
		var q = metadata[qId]
		i[q.title] = getValue(q, i.responses[qId])
	}
	//delete i.responses

}

function getValue(q, r) {
	var option,
		numericalOption;
	if(r === undefined || r === null) {
		return null
	}
  if (q.id === "15")
  {
      return r.value / r.gramsPerDrink;
  } 


	if(r.value) {
		return parseFloat(r.value, 10)
	}
	if(q.type === "RADIO" && r.optionId) {
		option = q.options[r.optionId]
		if(option) {
			numericalOption = parseInt(option, 10)
			if(!isNaN(numericalOption))
				option = numericalOption
			return option
		}
	}

	return null;
}

function filter(e) {
	
	if(e.age == 0)
	 return true
	if(e.cryCountThreeYears == 300)
	 return true
	if(e.weeklyDrinks == 0 || e.weeklyDrinks == 200)
	 return true

	return !(e.sex == 'f' || e.sex == 'm')

}

gulp.task('process', function() {

      return gulp.src('src/data/ca-open-data.json')
		 		.pipe(through2.obj(function(file, enc, cb) {
          var data = JSON.parse(file.contents.toString())
          var newData = data.reduce(function(c, i){

          	transform(i);
          	if(!filter(i)) {
          		c.push(i)
          	}
          	//console.log(i)
          	return c

          },[])


      		for (var i = 0; i < newData.length; i++)
          {
                  var e = newData[i];


                   if (e.responses["15"])
                  {
                          e.weeklyGrams = e.responses["15"].value;
                          e.weeklyDrinks = e.responses["15"].value / e.gramsPerDrink;
                  } else {
                          e.weeklyGrams = null;
                          e.weeklyDrinks = null; 
                  }

                  e.responses = null;

          }



          //console.log(newData)
          
          file.path = file.path.replace(/-data/, "-data-processed")
          file.contents = new Buffer(JSON.stringify(newData, null, '\t'))

          return cb(null, file)

        }))
        .pipe(gulp.dest('src/data'));
 })
