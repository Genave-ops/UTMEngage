// Export all models
module.exports = {
  User: require('./User'),
  Event: require('./Event'),
  EventRegistration: require('./EventRegistration'),
  Committee: require('./Committee'),
  CommitteeMember: require('./CommitteeMember'),
  CommitteeMeeting: require('./CommitteeMeeting'),
  CommitteeDocument: require('./CommitteeDocument'),
  Post: require('./Post'),
  PostLike: require('./PostLike'),
  PostComment: require('./PostComment'),
  JoinRequest: require('./JoinRequest'),
  Report: require('./Report'),
  Feedback: require('./Feedback'),
  SystemLog: require('./SystemLog'),
  BroadcastMessage: require('./BroadcastMessage'),
  UserGoogleToken: require('./UserGoogleToken'),
  Notification: require('./Notification'),
  CommitteeInvitation: require('./CommitteeInvitation')
};
