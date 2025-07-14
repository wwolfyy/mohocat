// Custom Firebase data provider for React-Admin
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/services/firebase';

export const firebaseDataProvider = {
  getList: async (resource: string, params: any) => {
    try {
      const { page = 1, perPage = 10 } = params.pagination || {};
      const { field, order } = params.sort || { field: 'id', order: 'ASC' };
      const filter = params.filter || {};

      let q = query(collection(db, resource));

      // Apply filters
      Object.keys(filter).forEach((key) => {
        if (filter[key] !== undefined && filter[key] !== '') {
          if (key === 'needsTagging') {
            q = query(q, where(key, '==', filter[key]));
          } else if (key === 'tags' && Array.isArray(filter[key])) {
            // Filter by tags array - contains any of the specified tags
            q = query(q, where(key, 'array-contains-any', filter[key]));
          } else {
            q = query(q, where(key, '==', filter[key]));
          }
        }
      });

      // Apply sorting
      if (field) {
        q = query(q, orderBy(field, order.toLowerCase() as 'asc' | 'desc'));
      }

      // Apply pagination
      if (page > 1) {
        // For pagination, we'd need to implement cursor-based pagination
        // For now, we'll use limit and offset (less efficient but simpler)
        const offset = (page - 1) * perPage;
        q = query(q, limit(perPage));
      } else {
        q = query(q, limit(perPage));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          // Convert Firestore timestamps to ISO strings for React-Admin
          uploadDate: docData.uploadDate?.toDate?.()?.toISOString() || docData.uploadDate,
        };
      });

      // Get total count (this is expensive in Firestore, consider using a counter document)
      const totalSnapshot = await getDocs(collection(db, resource));
      const total = totalSnapshot.size;

      return {
        data,
        total,
      };
    } catch (error) {
      console.error('getList error:', error);
      throw error;
    }
  },

  getOne: async (resource: string, params: any) => {
    try {
      const docRef = doc(db, resource, String(params.id));
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error(`Record ${params.id} not found`);
      }

      const data = docSnap.data();
      return {
        data: {
          id: docSnap.id,
          ...data,
          uploadDate: data.uploadDate?.toDate?.()?.toISOString() || data.uploadDate,
        },
      };
    } catch (error) {
      console.error('getOne error:', error);
      throw error;
    }
  },

  getMany: async (resource: string, params: any) => {
    try {
      const docs = await Promise.all(
        params.ids.map(async (id: any) => {
          const docRef = doc(db, resource, id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              uploadDate: data.uploadDate?.toDate?.()?.toISOString() || data.uploadDate,
            };
          }
          return null;
        })
      );

      return {
        data: docs.filter(Boolean),
      };
    } catch (error) {
      console.error('getMany error:', error);
      throw error;
    }
  },

  getManyReference: async (resource: string, params: any) => {
    try {
      const { target, id } = params;
      let q = query(collection(db, resource), where(target, '==', id));

      if (params.sort?.field) {
        q = query(q, orderBy(params.sort.field, params.sort.order.toLowerCase() as 'asc' | 'desc'));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          uploadDate: docData.uploadDate?.toDate?.()?.toISOString() || docData.uploadDate,
        };
      });

      return {
        data,
        total: data.length,
      };
    } catch (error) {
      console.error('getManyReference error:', error);
      throw error;
    }
  },

  create: async (resource: string, params: any) => {
    try {
      const docData = {
        ...params.data,
        uploadDate: new Date(), // Convert to Firestore timestamp
      };
      delete docData.id; // Remove id from data if present

      const docRef = await addDoc(collection(db, resource), docData);

      return {
        data: {
          id: docRef.id,
          ...params.data,
        },
      };
    } catch (error) {
      console.error('create error:', error);
      throw error;
    }
  },

  update: async (resource: string, params: any) => {
    try {
      const docRef = doc(db, resource, params.id);
      const updateData = { ...params.data };
      delete updateData.id; // Remove id from update data

      // Convert date strings back to Firestore timestamps if needed
      if (updateData.uploadDate && typeof updateData.uploadDate === 'string') {
        updateData.uploadDate = new Date(updateData.uploadDate);
      }

      await updateDoc(docRef, updateData);

      return {
        data: {
          id: params.id,
          ...params.data,
        },
      };
    } catch (error) {
      console.error('update error:', error);
      throw error;
    }
  },

  updateMany: async (resource: string, params: any) => {
    try {
      const updates = await Promise.all(
        params.ids.map(async (id: any) => {
          const docRef = doc(db, resource, id);
          const updateData = { ...params.data };
          delete updateData.id;

          await updateDoc(docRef, updateData);
          return id;
        })
      );

      return {
        data: updates,
      };
    } catch (error) {
      console.error('updateMany error:', error);
      throw error;
    }
  },

  delete: async (resource: string, params: any) => {
    try {
      const docRef = doc(db, resource, params.id);
      await deleteDoc(docRef);

      return {
        data: { id: params.id },
      };
    } catch (error) {
      console.error('delete error:', error);
      throw error;
    }
  },

  deleteMany: async (resource: string, params: any) => {
    try {
      await Promise.all(
        params.ids.map(async (id: any) => {
          const docRef = doc(db, resource, id);
          await deleteDoc(docRef);
        })
      );

      return {
        data: params.ids,
      };
    } catch (error) {
      console.error('deleteMany error:', error);
      throw error;
    }
  },
};
