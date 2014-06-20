'use strict';

// Photos controller
angular.module('photos').controller('PhotosController', ['$scope', '$stateParams', '$location', 'Authentication', 'Photos', '$upload', '$timeout', 
	function($scope, $stateParams, $location, Authentication, Photos, $upload, $timeout ) {
		
    $scope.authentication = Authentication;
    $scope.successMsg = null;
       
    $scope.onFileSelect = function(image) {
      $scope.uploadInProgress = true;
      $scope.uploadProgress = 0;        
      if (angular.isArray(image)) {
        image = image[0];
      }

      $scope.upload = $upload.upload({
        url: '/api/v1/upload/image',
        method: 'POST',
        data: {
          type: 'imagefile',
          userName: 'nicklewis'
        },
        file: image
      }).progress(function(event) {
        $scope.uploadProgress = Math.floor(event.loaded / event.total);
        $scope.$apply();
      }).success(function(data, status, headers, config) {
        // AlertService.success('Photo uploaded!');
        console.log('File uploaded OK: ' + data.fileName);     
        $scope.filename = data.fileName;
        $scope.successMsg = 'File uploaded: ' + data.fileName;
      }).error(function(err) {
        $scope.uploadInProgress = false;
        // AlertService.error('Error uploading file: ' + err.message || err);
      });
    };

		// Create new Photo
		$scope.create = function() {
			// Create new Photo object
			var photo = new Photos ({
				name: this.name,
        content: this.content,
        filename: this.filename
			});

			// Redirect after save
			photo.$save(function(response) {
				$location.path('photos/' + response._id);
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});

			// Clear form fields
			this.name = '';
      this.content = '';
      this.filename = '';
		};

		// Remove existing Photo
		$scope.remove = function( photo ) {
			if ( photo ) { photo.$remove();

				for (var i in $scope.photos ) {
					if ($scope.photos [i] === photo ) {
						$scope.photos.splice(i, 1);
					}
				}
			} else {
				$scope.photo.$remove(function() {
					$location.path('photos');
				});
			}
		};

		// Update existing Photo
		$scope.update = function() {
			var photo = $scope.photo ;

			photo.$update(function() {
				$location.path('photos/' + photo._id);
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		// Find a list of Photos
		$scope.find = function() {
			$scope.photos = Photos.query();
		};

		// Find existing Photo
		$scope.findOne = function() {
			$scope.photo = Photos.get({ 
				photoId: $stateParams.photoId
			});
		};
	}
]);