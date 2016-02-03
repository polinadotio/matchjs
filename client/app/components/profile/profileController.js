;(function() {
  'use strict';
    
  angular.module('app.profile', [])
    .constant('moment', moment)
    .controller('ProfileController', ['$scope', '$window', '$state', 'Profile','$sce', 'AuthService', 'invitationsModel', '$location', function ($scope, $window, $state, Profile, $sce, AuthService, invitationsModel, $location) {

    var current = new Date();

    $scope.currentUser = angular.fromJson(AuthService.getCurrentUser());

    $scope.profileUser = {};
    $scope.profileUser.username = $state.params.username;

    $scope.profileUser.toLearn = [];
    $scope.profileUser.toTeach = [];

    $scope.saveEditButton = {};
    $scope.saveEditButton.skills = {};
    $scope.saveEditButton.skills.buttonText = 'Edit';
    $scope.saveEditButton.basics = {};
    $scope.saveEditButton.basics.buttonText = 'Edit';
    $scope.saveEditButton.invites = {};
    $scope.saveEditButton.invites.buttonText = 'Edit';

    $scope.skills = {};
    $scope.skills.toLearn = {};
    $scope.skills.toTeach = {};
    $scope.skills.collection = ['AngularJS', 'Express', 'JavaScript', 'Backbone', 'Node.js', 'ReactJS'];

    $scope.editMode = {};
    $scope.editMode.isSameUser = '';
    $scope.editMode.inviteEditMode = '';
    $scope.editMode.isPadawan = '';

    $scope.UImessages = {};



    //-------------------BASICS------------------------
    $scope.toggleEditShowBasics = function() {
      if($scope.saveEditButton.basics.buttonText === 'Edit') {
        $scope.saveEditButton.basics.buttonText = 'Save';
      } else {
        $scope.saveEditButton.basics.buttonText='Edit';
        updateProfile($scope.profileUser); 
      }
    };


    //-------------------SKILLS------------------------
    		//called when SKILLS edit/show button is clicked
    $scope.toggleEditShowSkills = function() {
      if($scope.saveEditButton.skills.buttonText === 'Edit') {
        $scope.saveEditButton.skills.buttonText = 'Save';
      } else {
        updateProfile($scope.profileUser);
        $scope.saveEditButton.skills.buttonText='Edit';
      }
    };


    //---------SHARED BY BASICS & SKILLS---------------
    var updateProfile = function(userObj) {
      for(var learnKey in $scope.skills.toLearn) {
          if(!_.contains($scope.skills.toLearn, learnKey)) {
            userObj.toLearn.push(learnKey);
          }
          if(!$scope.skills.toLearn[learnKey]) {
            userObj.toLearn.splice(userObj.toLearn.indexOf(learnKey),1);
          }
      }
      for(var teachKey in $scope.skills.toTeach) {
        if(!_.contains($scope.skills.toTeach, teachKey)) {
            userObj.toTeach.push(teachKey);
        }
        if(!$scope.skills.toTeach[teachKey]) {
          userObj.toTeach.splice(userObj.toTeach.indexOf(teachKey),1);
        }
      }
      Profile.updateProfile(userObj) 
      .then(function(response) {
        $scope.getUserProfile(userObj);
      });
    };


    //-----------------INVITATIONS ----------------
    
    $scope.toggleInviteEditForm = function(inviteId) {
      if($scope.saveEditButton.invites.buttonText === 'Edit') {
        $scope.saveEditButton.invites.buttonText = 'Save';
      } else {
        $scope.saveEditButton.invites.buttonText = 'Edit';
      }
    };

    $scope.updateInvite = function(username, recipient, inviteId, inviteObj) {
      inviteObj.id = inviteId;
      inviteObj.username = username;
      inviteObj.mentee = recipient;
      invitationsModel.updateInvitation(inviteObj)
        .then(function(response) {
          $scope.UImessages.inviteUpdated = 'Your invitation has been updated, and ' + recipient + ' has been notified.';
          $scope.editMode.inviteEditMode = -1;
          getUserInvitations(username);
        });
    };

    $scope.deleteInvite = function(invite) {
      invitationsModel.deleteInvitation(invite)
        .then(function(response) {
          //add message text
          getUserInvitations($state.params.username);
        });
    };

    var getUserInvitations = function(username) {
      $scope.invitations = [];
      var invites = [];
      invitationsModel.getInvitationsByMentor(username)
      .then(function(mentorResp) {
        mentorResp.data.forEach(function(invite) {
          invite.when = moment(invite.when).format('dddd, MMMM Do YYYY, h:mm a');
          invites.push(invite);                
          invitationsModel.getInvitationsByMentee(username)
            .then(function(menteeResp) {
              menteeResp.data.forEach(function(invite) {
                invite.when = moment(invite.when).format('dddd, MMMM Do YYYY, h:mm a');
                invite.readOnly = true;
                invites.push(invite);
              });
              if(invites.length === 0) {
                $scope.UImessages.noInvites = $sce.trustAsHtml('You have no current invitations. <a href="/">Connect with more users</a> to set up a mentorship session.'); 
              } 
                $scope.invitations = invites;
            });
        });
      });
    };

    //-------------FOLLOWERS, AKA PADAWANS-----------------

    $scope.becomePadawan = function(mentor, padawan) {
      Profile.addPadawan(mentor, padawan)
      .then(function(response) {
        $scope.editMode.isPadawan = true;
      });
    };

    $scope.stopBeingAPadawan = function(mentor, padawan) {
      Profile.deletePadawan(mentor, padawan)  
      .then(function(response) {
        $scope.editMode.isPadawan = false;
        getPadawans(mentor);
      }); 
    };

    var getPadawans = function(mentor) {
      Profile.getPadawans(mentor)  
      .then(function(response) {
        $scope.padawans = response.data;
        for(var i = 0; i < response.data.length; i++) {
          if (response.data[i].padawanUsername === $scope.currentUser.username) {
            $scope.editMode.isPadawan = true;
          }
        }
      });
    };

    var getMentors = function(mentee) {
      Profile.getMentors(mentee)
      .then(function(response) {
        $scope.mentors = response.data;
      });
    };


    //---------------GET USER PROFILE---------------------
    	//called on the initialization of the HTML page, ng-init
    $scope.getUserProfile = function(userObj) {
      Profile.getUserProfile(userObj)
      .then(function(response) {
        //---if profile belongs to current user, set isSameUser var to true. This toggles the visibility of the edit buttons.
        if($scope.currentUser.username === $scope.profileUser.username) {
          $scope.editMode.isSameUser = true;
          getUserInvitations($scope.currentUser.username);
        }
        getPadawans($scope.profileUser);
        getMentors($scope.profileUser);

        //---populate the scope with the data returning from getUserProfile query.---
        $scope.profileUser.photo = response.data.photo;
        $scope.profileUser.location = response.data.location;
        // $scope.profileUser.name = response.data.displayName;
        $scope.profileUser.name = (response.data.username === $scope.currentUser.username ? $scope.currentUser.displayName : response.data.name);
        $scope.profileUser.github = response.data.github;
        $scope.profileUser.karmaPoints = response.data.karmaPoints;
        $scope.profileUser.summary =	response.data.summary;
        $scope.profileUser.displayName = response.data.displayName;
        response.data.toLearn.forEach(function(skill) {
          $scope.skills.toLearn[skill] = true;
        });
        response.data.toTeach.forEach(function(skill) {
          $scope.skills.toTeach[skill] = true;
        });
        $scope.contentLoaded = true;
      });
    };

    $scope.goToOtherUserProfile = function(username) {
      $location.path('profile/' + username);
    }; 

    $scope.sendMessage = function(username) {
      $location.path('inbox');
    }; 
  }]);
})();
