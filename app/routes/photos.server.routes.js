'use strict';

module.exports = function(app) {
	var users = require('../../app/controllers/users');
	var photos = require('../../app/controllers/photos');

  
	// Photos Routes
	app.route('/photos')
		.get(photos.list)
		.post(users.requiresLogin, photos.create);

	app.route('/photos/:photoId')
		.get(photos.read)
		.put(users.requiresLogin, photos.hasAuthorization, photos.update)
		.delete(users.requiresLogin, photos.hasAuthorization, photos.delete);

	// Finish by binding the Photo middleware
	app.param('photoId', photos.photoByID);
};