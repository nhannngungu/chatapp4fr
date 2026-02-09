const Messages = require("../model/messageModel");

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      return {
        id: msg._id,
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
        type: msg.message.type,
        reactions: msg.reactions,
      };
    });
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message, type } = req.body;
    const data = await Messages.create({
      message: { text: message, type: type || "text" },
      users: [from, to],
      sender: from,
    });

    if (data) return res.json({ msg: "Message added successfully.", data: data });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

module.exports.addReaction = async (req, res, next) => {
    try {
        const { messageId, emoji, from } = req.body;
        const message = await Messages.findById(messageId);
        if (message) {
            // Check if user already reacted? Replace or add?
            // Let's just push for now, or replace if exists.
            const existingReaction = message.reactions.find(r => r.from.toString() === from);
            if (existingReaction) {
                existingReaction.emoji = emoji;
            } else {
                message.reactions.push({ emoji, from });
            }
            await message.save();
            return res.json({ status: true, reactions: message.reactions });
        }
        return res.json({ status: false, msg: "Message not found" });
    } catch (ex) {
        next(ex);
    }
};
