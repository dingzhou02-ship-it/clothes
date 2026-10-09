import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase';
import { FileChunk } from '../types';

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
  storageType: 'firestore_chunks' | 'firebase_storage' | 'data_url';
  chunkCount: number;
  cloudFileId: string;
}

// Each Firestore document is capped at 1 MiB (1,048,576 bytes).
// 450 KB per chunk guarantees safe margin for UTF-8 & document metadata.
const CHUNK_CHAR_SIZE = 450 * 1024;

// In-memory cache of resolved Blob URLs for instant repeat preview/download
const blobUrlCache = new Map<string, string>();
// Local fallback cache for chunks in case of brief offline state
const localChunkCache = new Map<string, string>();

let activeStorageContext: {
  storeId: string;
  ownerUid: string;
  accessScope: 'store' | 'personal';
  role: 'admin' | 'staff';
} = {
  storeId: 'STORE_QICAI_DEFAULT',
  ownerUid: '',
  accessScope: 'store',
  role: 'staff',
};

function dataUrlToBlob(dataUrl: string, fallbackMime = 'application/octet-stream'): Blob {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('文件数据格式异常，无法解析内容');
  }
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+);/);
  const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function compressImageDataUrl(dataUrl: string, maxDim = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim && dataUrl.length < 260 * 1024) {
        resolve(dataUrl);
        return;
      }
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height >= width && height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const storageService = {
  setStorageScope(
    storeId: string,
    ownerUid: string,
    accessScope: 'store' | 'personal' = 'store',
    role: 'admin' | 'staff' = 'staff'
  ) {
    activeStorageContext = {
      storeId: storeId || 'STORE_QICAI_DEFAULT',
      ownerUid,
      accessScope,
      role,
    };
  },

  /**
   * 上传客户历史档案、试衣照片或面料图片至云端安全存储 (Firestore fileChunks 分片云存储)
   * - 彻底解决 Firebase Storage 未开通/CORS跨域导致进度卡在 0% 的问题
   * - 支持高达 15MB 的 PDF 及高清图片跨电脑、iPad、iPhone 实时共享与权限校验
   * - 进度百分比严格根据真实分片写入云端数据库的状态更新 (绝不虚假跳至100%)
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
      throw new Error('格式不支持：仅支持上传 PDF、JPG、JPEG、PNG 或 WEBP 格式的文件');
    }

    if (file.size === 0) {
      throw new Error('所选文件为空文件（0 字节），请重新选择有效文件');
    }

    if (file.size > 15 * 1024 * 1024) {
      throw new Error('单文件大小不能超过 15MB，请压缩后重试');
    }

    if (onProgress) onProgress(2);

    // Step 1: Read file into Base64 DataURL (0% -> 20%)
    let dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = e => {
        if (e.lengthComputable && e.total > 0 && onProgress) {
          const readPercent = Math.max(2, Math.round((e.loaded / e.total) * 18));
          onProgress(readPercent);
        }
      };
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result.length > 0) {
          if (onProgress) onProgress(20);
          resolve(reader.result);
        } else {
          reject(new Error('文件读取结果为空，请检查文件是否损坏'));
        }
      };
      reader.onerror = () => reject(new Error('无法读取所选本地文件，请确认文件权限后重试'));
      reader.readAsDataURL(file);
    });

    let mimeType =
      file.type ||
      (lowerName.endsWith('.pdf')
        ? 'application/pdf'
        : lowerName.endsWith('.png')
        ? 'image/png'
        : lowerName.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg');

    if (mimeType.startsWith('image/') && dataUrl.length > 260 * 1024) {
      const targetMaxDim = folder === 'archives' ? 2000 : 1600;
      const targetQuality = folder === 'archives' ? 0.85 : 0.8;
      dataUrl = await compressImageDataUrl(dataUrl, targetMaxDim, targetQuality);
      if (dataUrl.startsWith('data:image/jpeg')) {
        mimeType = 'image/jpeg';
      }
    }

    // Step 2: Split into Firestore-safe chunks (450KB each) and upload to cloud
    const cloudFileId = `CF_${folder.toUpperCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const totalLength = dataUrl.length;
    const totalChunks = Math.max(1, Math.ceil(totalLength / CHUNK_CHAR_SIZE));
    const nowIso = new Date().toISOString();

    for (let i = 0; i < totalChunks; i++) {
      const slice = dataUrl.slice(i * CHUNK_CHAR_SIZE, (i + 1) * CHUNK_CHAR_SIZE);
      const chunkDocId = `${cloudFileId}_chunk_${i}`;
      const chunkPayload: FileChunk = {
        id: chunkDocId,
        fileId: cloudFileId,
        chunkIndex: i,
        totalChunks,
        data: slice,
        mimeType,
        storeId: activeStorageContext.storeId || 'STORE_QICAI_DEFAULT',
        ownerUid: auth.currentUser?.uid || activeStorageContext.ownerUid || '',
        createdAt: nowIso,
      };

      try {
        await setDoc(doc(db, 'fileChunks', chunkDocId), chunkPayload);
      } catch (err: any) {
        const code = err?.code || '';
        if (code === 'permission-denied' || !auth.currentUser) {
          throw new Error('云端存储权限校验未通过：请确认您已使用授权管理员或有效操作员账号登录');
        }
        throw new Error(`云端分片上传失败 (第 ${i + 1}/${totalChunks} 块): ${err?.message || '网络连接异常'}`);
      }

      // Report real progress after each chunk is confirmed written to Firestore (20% -> 100%)
      if (onProgress) {
        const chunkProgress = 20 + Math.round(((i + 1) / totalChunks) * 80);
        onProgress(Math.min(100, chunkProgress));
      }
    }

    const chunkedUrl = `firestore://fileChunks/${cloudFileId}?chunks=${totalChunks}&mime=${encodeURIComponent(mimeType)}`;

    // Cache the assembled DataURL and Blob URL in memory for immediate preview on the current device
    localChunkCache.set(cloudFileId, dataUrl);
    try {
      const blob = dataUrlToBlob(dataUrl, mimeType);
      const blobUrl = URL.createObjectURL(blob);
      blobUrlCache.set(`firestore://fileChunks/${cloudFileId}::${totalChunks}`, blobUrl);
      blobUrlCache.set(chunkedUrl, blobUrl);
      blobUrlCache.set(cloudFileId, blobUrl);
    } catch {
      // ignore cache conversion error
    }

    // For small inline images (< 280KB), we can return the dataUrl directly
    // so standard <img> tags render without async resolution, while still backed by fileChunks.
    const isSmallInlineImage =
      mimeType.startsWith('image/') &&
      totalChunks === 1 &&
      dataUrl.length < 280 * 1024;

    return {
      url: isSmallInlineImage ? dataUrl : chunkedUrl,
      name: file.name,
      size: file.size,
      type: mimeType,
      storageType: isSmallInlineImage ? 'data_url' : 'firestore_chunks',
      chunkCount: totalChunks,
      cloudFileId,
    };
  },

  /**
   * 校验云端文件是否可正常读取（区分“已上传”、“记录已保存”与“档案可正常读取”）
   */
  async verifyFileReadable(fileUrl: string, expectedChunks?: number): Promise<boolean> {
    if (!fileUrl) return false;
    if (fileUrl.startsWith('data:') || fileUrl.startsWith('https://') || fileUrl.startsWith('http://')) {
      return fileUrl.length > 16;
    }
    if (fileUrl.startsWith('firestore://fileChunks/')) {
      const parsed = this.parseFirestoreFileUrl(fileUrl, expectedChunks);
      if (!parsed) return false;
      const firstChunkSnap = await getDoc(doc(db, 'fileChunks', `${parsed.cloudFileId}_chunk_0`));
      if (!firstChunkSnap.exists()) {
        throw new Error('云端档案校验失败：未在云端找到对应的文件分片数据');
      }
      const data = firstChunkSnap.data() as FileChunk;
      if (!data?.data || data.data.length === 0) {
        throw new Error('云端档案校验失败：文件分片内容为空');
      }
      return true;
    }
    return false;
  },

  parseFirestoreFileUrl(fileUrl: string, fallbackChunks?: number): {
    cloudFileId: string;
    totalChunks: number;
    mimeType: string;
  } | null {
    if (!fileUrl.startsWith('firestore://fileChunks/')) return null;
    const withoutPrefix = fileUrl.replace('firestore://fileChunks/', '');
    const [cloudFileId, queryStr] = withoutPrefix.split('?');
    const params = new URLSearchParams(queryStr || '');
    const totalChunks = Number(params.get('chunks')) || fallbackChunks || 1;
    const mimeType = params.get('mime') || 'application/octet-stream';
    return { cloudFileId, totalChunks, mimeType };
  },

  /**
   * 将任何档案 URL (firestore://fileChunks/..., data:..., https://...) 解析为浏览器可直接预览/下载的原生 URL (Blob URL)
   * 完美兼容 Windows/Mac 浏览器、iPad 与 iPhone Safari 的 PDF 预览和文件下载
   */
  async resolveFileUrl(fileUrl: string, fallbackChunks?: number): Promise<string> {
    if (!fileUrl) throw new Error('文件地址为空');

    if (blobUrlCache.has(fileUrl)) {
      return blobUrlCache.get(fileUrl)!;
    }

    if (fileUrl.startsWith('https://') || fileUrl.startsWith('http://') || fileUrl.startsWith('blob:')) {
      return fileUrl;
    }

    if (fileUrl.startsWith('data:')) {
      try {
        const blob = dataUrlToBlob(fileUrl);
        const blobUrl = URL.createObjectURL(blob);
        blobUrlCache.set(fileUrl, blobUrl);
        return blobUrl;
      } catch {
        return fileUrl;
      }
    }

    if (fileUrl.startsWith('firestore://fileChunks/')) {
      const parsed = this.parseFirestoreFileUrl(fileUrl, fallbackChunks);
      if (!parsed) throw new Error('无法解析云端档案路径');

      if (blobUrlCache.has(parsed.cloudFileId)) {
        return blobUrlCache.get(parsed.cloudFileId)!;
      }

      let fullDataUrl = localChunkCache.get(parsed.cloudFileId);
      if (!fullDataUrl) {
        // Fetch chunk 0 first to determine exact totalChunks if needed
        const firstSnap = await getDoc(doc(db, 'fileChunks', `${parsed.cloudFileId}_chunk_0`));
        if (!firstSnap.exists()) {
          throw new Error('云端未找到该档案文件数据，可能已被删除或尚未完成同步');
        }
        const firstChunk = firstSnap.data() as FileChunk;
        const count = firstChunk.totalChunks || parsed.totalChunks || 1;
        const chunks: string[] = new Array(count);
        chunks[0] = firstChunk.data;

        if (count > 1) {
          const promises: Promise<void>[] = [];
          for (let i = 1; i < count; i++) {
            promises.push(
              getDoc(doc(db, 'fileChunks', `${parsed.cloudFileId}_chunk_${i}`)).then(snap => {
                if (!snap.exists()) {
                  throw new Error(`档案文件分片缺失 (${i + 1}/${count})`);
                }
                chunks[i] = (snap.data() as FileChunk).data;
              })
            );
          }
          await Promise.all(promises);
        }

        fullDataUrl = chunks.join('');
        localChunkCache.set(parsed.cloudFileId, fullDataUrl);
      }

      const blob = dataUrlToBlob(fullDataUrl, parsed.mimeType);
      const blobUrl = URL.createObjectURL(blob);
      blobUrlCache.set(parsed.cloudFileId, blobUrl);
      blobUrlCache.set(fileUrl, blobUrl);
      return blobUrl;
    }

    return fileUrl;
  },

  /**
   * 触发浏览器标准文件下载（支持 PC、iPad 及 iPhone Safari）
   */
  async downloadFile(fileUrl: string, fileName: string, chunkCount?: number): Promise<void> {
    const resolvedUrl = await this.resolveFileUrl(fileUrl, chunkCount);
    const a = document.createElement('a');
    a.href = resolvedUrl;
    a.download = fileName || '客户档案文件';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  /**
   * 删除云端文件分片或存储对象
   */
  async deleteFile(url: string, chunkCount?: number): Promise<void> {
    if (!url) return;
    try {
      if (url.startsWith('firestore://fileChunks/')) {
        const parsed = this.parseFirestoreFileUrl(url, chunkCount);
        if (parsed) {
          const firstSnap = await getDoc(doc(db, 'fileChunks', `${parsed.cloudFileId}_chunk_0`));
          const total = firstSnap.exists()
            ? (firstSnap.data() as FileChunk).totalChunks || parsed.totalChunks
            : parsed.totalChunks;
          const delPromises: Promise<void>[] = [];
          for (let i = 0; i < total; i++) {
            delPromises.push(deleteDoc(doc(db, 'fileChunks', `${parsed.cloudFileId}_chunk_${i}`)));
          }
          await Promise.all(delPromises);
          const cachedBlob = blobUrlCache.get(parsed.cloudFileId);
          if (cachedBlob) URL.revokeObjectURL(cachedBlob);
          blobUrlCache.delete(parsed.cloudFileId);
          blobUrlCache.delete(url);
          localChunkCache.delete(parsed.cloudFileId);
        }
      } else if (url.startsWith('https://') && url.includes('firebasestorage')) {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      }
    } catch (err) {
      console.warn('云端文件清理提示:', err);
    }
  },

  /**
   * 退出登录时清理本地内存中的敏感文件缓存
   */
  clearMemoryCache(): void {
    blobUrlCache.forEach(blobUrl => {
      try {
        if (blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
      } catch {
        // ignore
      }
    });
    blobUrlCache.clear();
    localChunkCache.clear();
    activeStorageContext = {
      storeId: 'STORE_QICAI_DEFAULT',
      ownerUid: '',
      accessScope: 'store',
      role: 'staff',
    };
  },
};

