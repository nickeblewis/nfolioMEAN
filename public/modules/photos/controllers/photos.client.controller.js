'use strict';

// Photos controller
angular.module('photos').controller('PhotosController', ['$scope', '$stateParams', '$location', 'Authentication', 'Photos', '$upload', '$timeout', 
	function($scope, $stateParams, $location, Authentication, Photos, $upload, $timeout ) {
		
    $scope.authentication = Authentication;
    $scope.fileReaderSupported = window.FileReader != null;
    $scope.uploadRightAway = true;
    $scope.changeAngularVersion = function() {
      window.location.hash = $scope.angularVersion;
      window.location.reload(true);
    };

    $scope.hasUploader = function(index) {
      return $scope.upload[index] != null;
    };
    
    $scope.abort = function(index) {
      $scope.upload[index].abort(); 
      $scope.upload[index] = null;
    };

    $scope.angularVersion = window.location.hash.length > 1 ? window.location.hash.substring(1) : '1.2.0';

    $scope.onFileSelectX = function($files) {
      $scope.selectedFiles = [];
      $scope.progress = [];
      if ($scope.upload && $scope.upload.length > 0) {
        for (var i = 0; i < $scope.upload.length; i++) {
          if ($scope.upload[i] != null) {
            $scope.upload[i].abort();
          }
        }
      }
      
      $scope.upload = [];
      $scope.uploadResult = [];
      $scope.selectedFiles = $files;
      $scope.dataUrls = [];

      for ( var i = 0; i < $files.length; i++) {
        var $file = $files[i];
        if (window.FileReader && $file.type.indexOf('image') > -1) {
          var fileReader = new FileReader();
          fileReader.readAsDataURL($files[i]);
          var loadFile = function(fileReader, index) {
            fileReader.onload = function(e) {
              $timeout(function() {
                $scope.dataUrls[index] = e.target.result;
              });
            }
          }(fileReader, i);
        }
        
        $scope.progress[i] = -1;
        if ($scope.uploadRightAway) {
          $scope.start(i);
        }
      }
    };
    
    $scope.start = function(index) {
      $scope.progress[index] = 0;
      $scope.errorMsg = null;
      
//       if ($scope.howToSend == 1) {
        $scope.upload[index] = $upload.upload({
          url : '/api/v1/upload/image',
            method: 'POST',
              headers: {'my-header': 'my-header-value'},
              data : {
                myModel : $scope.myModel
              },
              file: $scope.selectedFiles[index],
              fileFormDataName: 'myFile'
            }).then(function(response) {
              $scope.uploadResult.push(response.data);
            }, function(response) {
              if (response.status > 0) $scope.errorMsg = response.status + ': ' + response.data;
            }, function(evt) {
              // Math.min is to fix IE which reports 200% sometimes
              $scope.progress[index] = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
            }).xhr(function(xhr){
              xhr.upload.addEventListener('abort', function() {console.log('abort complete')}, false);
            });
//           } else {
//             var fileReader = new FileReader();
//             fileReader.onload = function(e) {
//               $scope.upload[index] = $upload.http({
//                 url: '/api/v1/upload/image',
//                 headers: {'Content-Type': $scope.selectedFiles[index].type},
//                 data: e.target.result
//               }).then(function(response) {
//                 $scope.uploadResult.push(response.data);
//               }, function(response) {
//                 if (response.status > 0) $scope.errorMsg = response.status + ': ' + response.data;
//               }, function(evt) {
//                 // Math.min is to fix IE which reports 200% sometimes
//                 $scope.progress[index] = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
//               });
//             }
//             fileReader.readAsArrayBuffer($scope.selectedFiles[index]);
//           }
        };
	
	$scope.resetInputFile = function() {
		var elems = document.getElementsByTagName('input');
		for (var i = 0; i < elems.length; i++) {
			if (elems[i].type == 'file') {
				elems[i].value = null;
			}
		}
	};
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
		        type: 'profile'
		      },
		      file: image
		    }).progress(function(event) {
		      $scope.uploadProgress = Math.floor(event.loaded / event.total);
		      $scope.$apply();
		    }).success(function(data, status, headers, config) {
		      // AlertService.success('Photo uploaded!');
          console.log('File uploaded OK: ' + data.fileName);     
          $scope.filename = data.fileName;
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