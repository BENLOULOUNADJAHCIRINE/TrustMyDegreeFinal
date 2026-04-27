const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const uploadPDFtoPinata = async (filePath) => {
  const fileStream = fs.createReadStream(filePath);

  const form = new FormData();
  form.append("file", fileStream);

  const response = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    form,
    {
      headers: {
        ...form.getHeaders(),
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );

  return response.data.IpfsHash;
};

module.exports = { uploadPDFtoPinata };