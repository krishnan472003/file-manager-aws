"use client";

import { useState, useEffect } from "react";
import AWS from "aws-sdk"

export default function Home() {

  const AWS_BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME;
  const AWS_ACCESSKEYID = process.env.NEXT_PUBLIC_AWS_ACCESSKEYID;
  const AWS_SECRETACCESSKEY = process.env.NEXT_PUBLIC_AWS_SECRETACCESSKEY
  const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION;

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
      // Upload the image to S3
      const result = await s3.upload(params).promise();
      // Get the URL of the uploaded image
      setImageUrl(result.Location);
      fetchImageList(); // Fetch updated image list after upload
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
      const images = result.Contents?.map((item) => {
        const imageUrl = s3.getSignedUrl("getObject", {
          Bucket: AWS_BUCKET_NAME,
          Key: item.Key!,
          Expires: 60, // URL expires in 60 seconds
        });
        return imageUrl;
      }) || [];
      setImageList(images); // Update state with the list of image URLs
    } catch (error) {
      console.error("Error fetching image list:", error);
    }
  };

  // Fetch the image list on page load
  useEffect(() => {
    fetchImageList();
  }, []);

  return (
    <div>
      <h1>Upload Image to S3</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload Image"}
      </button>

      {imageUrl && (
        <div>
          <h2>Uploaded Image:</h2>
          <img src={imageUrl} alt="Uploaded" style={{ maxWidth: "300px" }} />
        </div>
      )}

      <h2>Uploaded Images</h2>
      <div>
        {imageList.length > 0 ? (
          imageList.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`uploaded-${index}`}
              style={{ maxWidth: "300px", margin: "10px" }}
            />
          ))
        ) : (
          <p>No images found</p>
        )}
      </div>
    </div>
  );
}
