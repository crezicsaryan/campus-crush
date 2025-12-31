import React, { useEffect, useRef } from 'react';

const UploadWidget = ({ onUpload }) => { // <--- 1. Accept the "onUpload" prop
  const cloudinaryRef = useRef();
  const widgetRef = useRef();

  useEffect(() => {
    cloudinaryRef.current = window.cloudinary;
    
    widgetRef.current = cloudinaryRef.current.createUploadWidget({
      cloudName: 'djujs1suh',
      uploadPreset: 'collegecrush_uploads'
    }, function(error, result) {
      if (!error && result && result.event === "success") { 
        console.log("Done! Image info: ", result.info); 
        
        // 2. Send the "public_id" (the image name) back to App.js
        onUpload(result.info.public_id); 
      }
    });
  }, [onUpload]);

  return (
    <button onClick={() => widgetRef.current.open()}>
      Upload Photo
    </button>
  );
};

export default UploadWidget;