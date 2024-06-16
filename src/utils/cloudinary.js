import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'
import { ApiResponse } from './apiResponse.js';
import { ApiError } from './apiError.js';


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary = async (id, resource_type="image") => {
    try {
        return cloudinary.uploader.destroy(id, {resource_type: `${resource_type}`})
            .then((result) => {
                return new ApiResponse(200, result, "Deleted Successfully");
            })
            .catch((error) => {
                throw new ApiError(500, "Failed to delete resource");
            });
    } catch (error) {
        return new ApiError(500, "An unexpected error occurred");
    }
};

export {uploadOnCloudinary,deleteFromCloudinary}