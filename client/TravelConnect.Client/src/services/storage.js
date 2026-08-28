import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";

const storage = getStorage();

export async function uploadImage(collection, file, name) {
  const ext = file.name.split(".").pop();
  const safeName = (name || file.name).replace(/[^a-zA-Z0-9-_]/g, "_");
  const path = `${collection}/${safeName}-${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteImage(url) {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch {
    // Image may already be deleted or URL invalid
  }
}

export async function getImages(collection) {
  const listRef = ref(storage, collection);
  const res = await listAll(listRef);
  const urls = await Promise.all(res.items.map((item) => getDownloadURL(item)));
  return urls;
}
