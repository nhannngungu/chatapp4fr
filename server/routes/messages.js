const { addMessage, getMessages, addReaction } = require("../controllers/messageController");
const router = require("express").Router();
const multer = require("multer");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, uniqueSuffix + '-' + file.originalname)
    }
})
const upload = multer({ storage: storage })

router.post("/addmsg", addMessage);
router.post("/getmsg", getMessages);
router.post("/addreaction", addReaction);
router.post("/upload", upload.single('file'), (req, res) => {
    if(!req.file) return res.status(400).json({ msg: "No file uploaded" });
    res.json({ path: req.file.filename });
});

module.exports = router;
