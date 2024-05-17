import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    const { username, fullname, email, password } = req.body;
    console.log(([username, fullname, email, password].some((field) => field?.trim() === "")))

    if ([username, fullname, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    console.log("🚀 ~ registerUser ~ existedUser:", existedUser)

    if (existedUser) {
        throw new ApiError(409, "User already exists")
    }
    console.log("req.files : ", req.files);

    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ){
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




// const loginUser = asyncHandler(async (res,req)=> {
//     const {username , password} = req.body

// })

export { registerUser }