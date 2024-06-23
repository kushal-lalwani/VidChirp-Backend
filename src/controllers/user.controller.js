import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const cookieOptions = {
    httpOnly: true,
    secure: true
}

const generateTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens")
    }

}

const registerUser = asyncHandler(async (req, res) => {
    const { username, fullname, email, password } = req.body;
    console.log("🚀 ~ registerUser ~ const { username, fullname, email, password } = req.body;:", username, fullname, email, password)
    console.log(([username, fullname, email, password].some((field) => field?.trim() === "")))

    if ([username, fullname, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    console.log("🚀 ~ registerUser ~ existedUser:", existedUser)

    if (existedUser) {
        throw new ApiError(400, "User already exists")
    }
    console.log("req.files : ", req.files);


    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        console.log("Yes");
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is Required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar is Required Cloudinary")
    }


    console.log("🚀 ~ registerUser ~ avatar:", avatar)

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user?._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Server Error: Something went wrong while registering the user")
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"))
});



const loginUser = asyncHandler(async (req, res) => {
    const { username, password } = req.body

    if (!username) {
        throw new ApiError(400, "Username required")
    }

    const user = await User.findOne({ username })
    if (!user) {
        throw new ApiError(404, "User not found")

    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    console.log(user._id);
    const { accessToken, refreshToken } = await generateTokens(user._id)

    const loggedinUser = await User.findById(user._id).select("-password -refreshToken")



    return res.status(200).cookie("accessToken", accessToken, cookieOptions).cookie("refreshToken", refreshToken, cookieOptions).json(new ApiResponse(200, {
        user: loggedinUser,
        accessToken,
        refreshToken
    }, "User loggedIn successfully"))
})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $unset: {
                refreshToken: 1
            },

        },
        {
            new: true                //returns updated user , btw not storing here in variable.
        })


    return res.status(200).clearCookie("accessToken", cookieOptions).clearCookie("refreshToken", cookieOptions).json(new ApiResponse(200, {}, "User Logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const cookieRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!cookieRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedRefreshToken = jwt.verify(cookieRefreshToken, process.env.ACCESS_TOKEN_SECRET)

        const user = User.findById(decodedRefreshToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        if (cookieRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Expired Refreh Token")
        }

        const { accessToken, refreshToken } = await generateTokens(user._id)

        return res.status(200).cookie("accessToken", accessToken, cookieOptions).cookie("refreshToken", refreshToken, cookieOptions).json(new ApiResponse(200, accessToken, refreshToken, "Access Token Refreshed"))
    } catch (error) {
        throw new ApiError(401, error.message)
    }

})


const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id)
    const passwordCheck = await user.isPasswordCorrect(oldPassword)

    if (!passwordCheck) {
        throw new ApiError(400, "Invalid Password")
    }

    // can also check if new and old password is same

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(200, {}, "Password Changed Successfully"))
})

const getUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Current User Fetched"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body
    console.log(req.body);
    if (!fullname && !email) {
        throw new ApiError(400, "Fields required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            fullname: fullname,
            email: email
        }
    }, { new: true }).select("-password")
    // new true for getting details after update

    return res.status(200).json(new ApiResponse(200, user, "Account details updated"))
})

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Path missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(500, "Error while uploading")
    }

    let user = await User.findById(req.user._id)

    const response = await deleteFromCloudinary(user.avatar)
    if (!response.success) {
        throw new ApiError(500, "Failed to delete the resource")
    }

    user.avatar = avatar.url;
    user = await user.save({ validateBeforeSave: false })   

    return res.status(200).json(new ApiResponse(200, user, "Avatar Updated Succesfully"))

})



const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Path missing")
    }

    const coverImage = await uploadOnCloudinary(avatarLocalPath)

    if (!coverImage.url) {
        throw new ApiError(500, "Error while uploading")
    }

    const user = await User.findById(req.user._id)

    const response = await deleteFromCloudinary(user.coverImage)
    if (!response.success) {
        throw new ApiError(500, "Failed to delete the resource")
    }

    user.coverImage = coverImage.url;
    user = await user.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(200, user, "Cover Image Updated Succesfully"))

})


const getUserChannel = asyncHandler(async (req, res) => {

    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            // matching the channel of all objects/documents of subscription model to get the subscriber..
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            //matching the subcriber of all objects of subcription model to get what channel is this user subscribing
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                // to get subscribed or subscribe button
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            }
        }

    ])
    console.log(channel)

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist")
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "User Channel Fetched"))
})

const getWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
                // as req.user._id returns string of that id while it is stored as an ObjectId
                //  depreacted, can use mongoose.Types.ObjectId.createFromHexString() 
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                },
                                //now $first for structuring the data,else the owner field will have array and the first object will have the data.(frontend likhe tab dekhna )
                                {
                                    $addFields:{
                                        owner:{
                                            $first:"$owner"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200,user[0].watchHistory,"watch history fetched"))
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getUser, updateAccountDetails, updateAvatar, updateCoverImage, getUserChannel, getWatchHistory }