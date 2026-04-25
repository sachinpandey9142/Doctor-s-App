const User = require("../models/User");

const ReputationEvents = {
  POST_CREATED: 10,
  POST_LIKED: 2,
  COMMENT_CREATED: 1
};

const increaseReputation = async (userId, delta) => {
  if (!userId || !delta) {
    return null;
  }

  return User.findByIdAndUpdate(userId, { $inc: { reputationScore: delta } }, { new: true }).select(
    "_id reputationScore"
  );
};

module.exports = {
  ReputationEvents,
  increaseReputation
};
