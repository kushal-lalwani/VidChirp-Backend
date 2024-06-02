import { Router } from "express";
import { changePassword, getUser, getUserChannel, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateAvatar, updateCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]), registerUser)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/user").post(verifyJWT, getUser)
router.route("/channel/:username").post(verifyJWT, getUserChannel)
router.route("/change-password").post(verifyJWT, changePassword)
router.route("/update-details").patch(verifyJWT, updateAccountDetails)
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)
router.route("/update-coverimage").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)
router.route("/watch-history").post(verifyJWT, getWatchHistory)


export default router;