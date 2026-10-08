import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
  storageType: 'firebase' | 'local';
}

export const storageService = {
  /**
   * 上传文件（PDF 或 图片）
   * 优先上传至云端 Firebase Storage，若存储桶未开通或跨域受限，
   * 自动降级为高保真 Base64 格式保存，确保用户在任何环境下上传 100% 成功。
   */
  async uploadFile(
    file: File,
    folder: 'archives' | 'materials' | 'customers' = 'archives',
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const lowerName = file.name.toLowerCase();
    const isValidExt = validExtensions.some(ext => lowerName.endsWith(ext));
    const isValidMime =
      file.type === 'application/pdf' ||
      file.type.startsWith('image/jpeg') ||
      file.type.startsWith('image/png') ||
      file.type.startsWith('image/webp');

    if (!isValidExt && !isValidMime) {
      throw new Error('只支持上传 PDF、JPG、JPEG、PNG 或 WEBP 格式的文件');
    }

    if (file.size > 25 * 1024 * 1024) {
      throw new Error('单文件大小不能超过 25MB');
    }

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '_');
      const uniquePath = `${folder}/${Date.now()}_${sanitizedName}`;
      const storageRef = ref(storage, uniquePath);

      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'application/octet-stream',
      });

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          snapshot => {
            if (snapshot.totalBytes > 0 && onProgress) {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              onProgress(progress);
            }
          },
          error => {
            console.warn('Firebase Storage 上传遇到限制，自动转为内置安全存储:', error);
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              resolve(url);
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      return {
        url: downloadUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        storageType: 'firebase',
      };
    } catch {
      // 容错降级：转换成 Data URL 本地持久化
      if (onProgress) onProgress(40);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = e => {
          if (e.lengthComputable && onProgress) {
            const p = Math.round((e.loaded / e.total) * 60) + 40;
            onProgress(Math.min(99, p));
          }
        };
        reader.onload = () => {
          if (onProgress) onProgress(100);
          resolve(reader.result as string);
        };
        reader.onerror = () => reject(new Error('无法读取所选本地文件'));
        reader.readAsDataURL(file);
      });

      return {
        url: dataUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        storageType: 'local',
      };
    }
  },

  /**
   * 删除文件
   */
  async deleteFile(url: string): Promise<void> {
    if (!url) return;
    try {
      if (url.startsWith('https://') && url.includes('firebasestorage')) {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      }
    } catch (err) {
      console.warn('存储空间删除提示:', err);
    }
  },
};
