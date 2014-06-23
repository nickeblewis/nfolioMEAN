'use strict';

// TODO: Break out the image upload feature as its own module and with its own dependencies for re-use in other projects
/**
 * Module dependencies.
 */
var express = require('express'),
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  session = require('express-session'),
  compress = require('compression'),
  methodOverride = require('method-override'),
  cookieParser = require('cookie-parser'),
  helmet = require('helmet'),
  passport = require('passport'),
  mongoStore = require('connect-mongo')({session: session}),
  flash = require('connect-flash'),
  config = require('./config'),
  consolidate = require('consolidate'),
  path = require('path'),
  fs = require('fs'),
  uuid = require('uuid'),
  multiparty = require('multiparty'),
  AWS = require('aws-sdk'),
  im = require('imagemagick');
//     gm = require('gm').subClass({ imageMagick: true });
//     resize = require('image-resize-stream');

module.exports = function(db) {
  // Initialize express app
  var app = express();

  app.post('/api/v1/upload/image', function(req, res) {
    
    var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {  
      
    var obj = JSON.parse(fields.sizes);
      
      
      var medium = JSON.parse(fields.medium);
      var thumbnail = JSON.parse(fields.thumbnail);
               
      var file = files.file[0];
      var contentType = file.headers['content-type'];
      var extension = file.path.substring(file.path.lastIndexOf('.'));
      //var destPath = '/nicklewis/profile' + '/' + uuid.v4() + extension;      
      
      // TODO: Pass in the username from the front-end and store it in this variable
      var userName = 'nicklewis';
      
      
      // console.log(fields.s3bucket);
      // TODO: Thinking of storing this in a config file or passing it in from client???
      var bucketName = 'nfolio-images';
      
      // TODO: Imagefile, Avatar and so on
      // var type = obj.type;
      
      // TODO: Merge fullpath and keyname variables together for cleaner code?
      // TODO: Need to introduce another directory level for different image sizes
      // TODO: Original image is passed to server by client and this function creates variants
      // TODO: Thumb, medium, original - what other sizes are likely to be needed??
      var keyName = userName + '/' + uuid.v4() + '/' + file.originalFilename;
      var fullPath = bucketName + '/' + keyName;
      
      // TODO: I would prefere that this was a similar name to that of the main image
      // TODO: Must delete these temporary files as soon as they are uploaded
      var tmpFile = 'tmp/images/' + uuid.v4();
      
      resize(file,tmpFile,fullPath,bucketName,keyName,800,800);
      
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ fileName: fullPath }, null, 3));                     
    });
  });

  function resize(file,tmpFile,fullPath,bucketName,keyName,width,height) {
    // STEP 1 - RESIZE
      // TODO: Would it be better to pass in sizes from client??            
      im.resize({
        srcPath: file.path,
        dstPath: tmpFile,
        width: width,
        height: height
      }, function(err, stdout, stderr){
        if (err) {
          // It is possible that the resize may fail, perhaps lack of memory or some other reason?
          // TODO: What should we do if the resize fails? Just pass a message back to the client???
          console.log('error while resizing images' + stderr);
        } else {
          // STEP 2 - UPLOAD TO S3
          // I moved this within this callback, so that we know the file has been resized and output file EXISTS!
          console.log('Image resized successfully: ' + tmpFile);
          sendToS3(tmpFile,fullPath,bucketName,keyName);
                  
          
        }
      });
  }
  
  function sendToS3(tmpFile,fullPath,bucketName,keyName) {
    // Loads the credentials from a file on the server (more secure)
      AWS.config.loadFromPath('./config/config.json');
      
      var s3 = new AWS.S3();
    console.log(tmpFile);
    var rs = fs.createReadStream(tmpFile);
    var params = {Bucket: bucketName, Key: keyName, Body: rs};
    s3.putObject(params, function(err, data) {
      if (err) {
        // TODO: Take action if this fails but in what way?
        // TODO: Send a fail back to the client which should then message the user accordingly
        console.log(err);
      } else {
        // Success return the filename generated for this upload
        console.log('Successfully uploaded data to ' + fullPath);
      }
    });
  }
  
	// Globbing model files
	config.getGlobbedFiles('./app/models/**/*.js').forEach(function(modelPath) {
		require(path.resolve(modelPath));
	});

	// Setting application local variables
	app.locals.title = config.app.title;
	app.locals.description = config.app.description;
	app.locals.keywords = config.app.keywords;
	app.locals.facebookAppId = config.facebook.clientID;
	app.locals.jsFiles = config.getJavaScriptAssets();
	app.locals.cssFiles = config.getCSSAssets();

	// Passing the request url to environment locals
	app.use(function(req, res, next) {
		res.locals.url = req.protocol + ':// ' + req.headers.host + req.url;
		next();
	});

	// Should be placed before express.static
	app.use(compress({
		filter: function(req, res) {
			return (/json|text|javascript|css/).test(res.getHeader('Content-Type'));
		},
		level: 9
	}));

	// Showing stack errors
	app.set('showStackError', true);

	// Set swig as the template engine
	app.engine('server.view.html', consolidate[config.templateEngine]);

	// Set views path and view engine
	app.set('view engine', 'server.view.html');
	app.set('views', './app/views');

	// Environment dependent middleware
	if (process.env.NODE_ENV === 'development') {
		// Enable logger (morgan)
		app.use(morgan('dev'));

		// Disable views cache
		app.set('view cache', false);
	} else if (process.env.NODE_ENV === 'production') {
		app.locals.cache = 'memory';
	}

	// Request body parsing middleware should be above methodOverride
	app.use(bodyParser.urlencoded());
	app.use(bodyParser.json());
	app.use(methodOverride());

	// Enable jsonp
	app.enable('jsonp callback');

	// CookieParser should be above session
	app.use(cookieParser());

	// Express MongoDB session storage
	app.use(session({
		secret: config.sessionSecret,
		store: new mongoStore({
			db: db.connection.db,
			collection: config.sessionCollection
		})
	}));

	// use passport session
	app.use(passport.initialize());
	app.use(passport.session());

	// connect flash for flash messages
	app.use(flash());

	// Use helmet to secure Express headers
	app.use(helmet.xframe());
	app.use(helmet.iexss());
	app.use(helmet.contentTypeOptions());
	app.use(helmet.ienoopen());
	app.disable('x-powered-by');

	// Setting the app router and static folder
	app.use(express.static(path.resolve('./public')));

	// Globbing routing files
	config.getGlobbedFiles('./app/routes/**/*.js').forEach(function(routePath) {
		require(path.resolve(routePath))(app);
	});

	// Assume 'not found' in the error msgs is a 404. this is somewhat silly, but valid, you can do whatever you like, set properties, use instanceof etc.
	app.use(function(err, req, res, next) {
		// If the error object doesn't exists
		if (!err) return next();

		// Log it
		console.error(err.stack);

		// Error page
		res.status(500).render('500', {
			error: err.stack
		});
	});

	// Assume 404 since no middleware responded
	app.use(function(req, res) {
		res.status(404).render('404', {
			url: req.originalUrl,
			error: 'Not Found'
		});
	});

	return app;
};