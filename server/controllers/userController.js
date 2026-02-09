const User = require("../model/userModel");
const bcrypt = require("bcrypt");
const axios = require("axios");

module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    const usernameCheck = await User.findOne({ username });
    if (usernameCheck)
      return res.json({ msg: "Username đã được sử dụng.", status: false });
      
    const emailCheck = await User.findOne({ email });
    if (emailCheck)
      return res.json({ msg: "Email đã được sử dụng.", status: false });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
    });
    
    delete user.password;
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.json({ msg: "Username hoặc mật khẩu không đúng", status: false });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.json({ msg: "Username hoặc mật khẩu không đúng", status: false });
    delete user.password;
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

module.exports.setAvatar = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const avatarImage = req.body.image;
    const userData = await User.findByIdAndUpdate(
      userId,
      {
        isAvatarImageSet: true,
        avatarImage,
      },
      { new: true }
    );
    return res.json({
      isSet: userData.isAvatarImageSet,
      image: userData.avatarImage,
    });
  } catch (ex) {
    next(ex);
  }
};

module.exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.id } }).select([
      "email",
      "username",
      "avatarImage",
      "_id",
    ]);
    return res.json(users);
  } catch (ex) {
    next(ex);
  }
};

module.exports.getRandomAvatar = async (req, res, next) => {
    try {
        const id = req.params.id;
        // Use DiceBear API which is more reliable and free
        const response = await axios.get(`https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`, {
            responseType: 'arraybuffer'
        });
        const buffer = Buffer.from(response.data, 'binary');
        return res.send(buffer.toString('base64'));
    } catch (ex) {
        // Fallback or error handling
        console.error("Avatar fetch error:", ex.message);
        // Try fallback or just return error
        next(ex);
    }
};

module.exports.logOut = (req, res, next) => {
    try {
        if (!req.params.id) return res.json({ msg: "User id is required " });
        onlineUsers.delete(req.params.id);
        return res.status(200).send();
    } catch (ex) {
        next(ex);
    }
};
