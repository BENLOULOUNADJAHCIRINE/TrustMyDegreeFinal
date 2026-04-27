const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

// AWS SDK v3 strips custom headers from $metadata.
// We use a middleware to capture the raw x-amz-meta-cid header from Filebase.
const makS3Client = () => {
  let capturedCid = null;

  const client = new S3Client({
    endpoint: "https://s3.filebase.com",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.FILEBASE_KEY,
      secretAccessKey: process.env.FILEBASE_SECRET,
    },
  });

  // Middleware that intercepts the raw HTTP response before SDK parses it
  client.middlewareStack.add(
    (next) => async (args) => {
      const result = await next(args);
      const headers = result.response?.headers;
      if (headers) {
        capturedCid =
          headers["x-amz-meta-cid"] ||
          headers["X-Amz-Meta-Cid"] ||
          null;
      }
      return result;
    },
    { step: "deserialize", name: "captureCidMiddleware", after: "ParseBody" }
  );

  return { client, getCid: () => capturedCid };
};

const uploadPDFtoPinata = async (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const { client, getCid } = makS3Client();

  const command = new PutObjectCommand({
    Bucket: process.env.FILEBASE_BUCKET,
    Key: fileName,
    Body: fileBuffer,
    ContentType: "application/pdf",
  });

  await client.send(command);

  const cid = getCid();
  console.log("[uploadPDFtoPinata] Raw CID from middleware:", cid);

  if (!cid) throw new Error("Filebase did not return an IPFS CID — check FILEBASE_KEY, FILEBASE_SECRET, and FILEBASE_BUCKET in your .env");

  return cid;
};

module.exports = { uploadPDFtoPinata };