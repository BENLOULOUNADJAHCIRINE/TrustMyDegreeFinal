const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadAvatarToCloudinary = async (fileBuffer, userId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "trustmydegree/avatars",
        public_id: `avatar_${userId}`,
        overwrite: true,
        resource_type: "image",
        transformation: [{ width: 300, height: 300, crop: "fill", gravity: "face" }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

module.exports = { uploadAvatarToCloudinary };