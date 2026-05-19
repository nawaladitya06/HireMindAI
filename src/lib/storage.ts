import { v2 as cloudinary } from 'cloudinary';

export interface StorageProvider {
  uploadFile(file: File, path: string): Promise<{ url: string; key: string }>;
  deleteFile(key: string): Promise<void>;
  getSignedUrl(key: string): Promise<string>;
}

class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(file: File, path: string): Promise<{ url: string; key: string }> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: path, resource_type: "auto" },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result?.secure_url || "",
            key: result?.public_id || "",
          });
        }
      );
      uploadStream.end(buffer);
    });
  }

  async deleteFile(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key);
  }

  async getSignedUrl(key: string): Promise<string> {
    return cloudinary.url(key);
  }
}

class LocalStorageProvider implements StorageProvider {
  async uploadFile(file: File, path: string): Promise<{ url: string; key: string }> {
    const key = `${path}/${Date.now()}-${file.name}`;
    const url = `/uploads/${key}`; 
    return { url, key };
  }
  async deleteFile(key: string): Promise<void> {}
  async getSignedUrl(key: string): Promise<string> { return `/uploads/${key}`; }
}

export function getStorageProvider(): StorageProvider {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    return new CloudinaryStorageProvider();
  }
  return new LocalStorageProvider();
}
