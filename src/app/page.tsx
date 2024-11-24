"use client";

import { useState, useEffect } from "react";
import AWS from "aws-sdk";

export default function Home() {
  const AWS_BUCKET_NAME = "my-app-image-ca-proj";
  const AWS_ACCESSKEYID = process.env.NEXT_PUBLIC_AWS_ACCESSKEYID;
  const AWS_SECRETACCESSKEY = process.env.NEXT_PUBLIC_AWS_SECRETACCESSKEY;
  const AWS_REGION = "ap-southeast-1";

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageList, setImageList] = useState<string[]>([]);

  // Configure AWS SDK
  AWS.config.update({
    accessKeyId: AWS_ACCESSKEYID,
    secretAccessKey: AWS_SECRETACCESSKEY,
    region: AWS_REGION,
  });

  const s3 = new AWS.S3();

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files ? event.target.files[0] : null;
    setFile(selectedFile);
  };

  // Upload file to S3
  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);

    const params = {
      Bucket: AWS_BUCKET_NAME,
      Key: file.name, // S3 object key (file name)
      Body: file, // File content
      ContentType: file.type, // Content type of the file (optional)
    };

    try {
      const result = await s3.upload(params).promise();
      setImageUrl(result.Location);
      fetchImageList();
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch all images from S3
  const fetchImageList = async () => {
    const params = {
      Bucket: AWS_BUCKET_NAME,
    };

    try {
      const result = await s3.listObjectsV2(params).promise();
      const images =
        result.Contents?.map((item) => {
          const imageUrl = s3.getSignedUrl("getObject", {
            Bucket: AWS_BUCKET_NAME,
            Key: item.Key!,
            Expires: 60, // URL expires in 60 seconds
          });
          return imageUrl;
        }) || [];
      setImageList(images);
    } catch (error) {
      console.error("Error fetching image list:", error);
    }
  };

  // Fetch the image list on page load
  useEffect(() => {
    fetchImageList();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">
          Upload Image to S3
        </h1>
        <div className="flex flex-col items-center gap-4">
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className={`px-6 py-2 rounded-lg text-white ${
              isUploading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isUploading ? "Uploading..." : "Upload Image"}
          </button>
        </div>
        {imageUrl && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-700">Uploaded Image:</h2>
            <div className="mt-4 flex justify-center">
              <img
                src={imageUrl}
                alt="Uploaded"
                className="rounded-lg border border-gray-200 shadow-sm max-w-xs"
              />
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Uploaded Images
        </h2>
        {imageList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {imageList.map((url, index) => (
              <div key={index} className="flex justify-center">
                <img
                  src={url}
                  alt={`uploaded-${index}`}
                  className="rounded-lg border border-gray-200 shadow-sm max-w-full"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">No images found</p>
        )}
      </div>
    </div>
  );
}
