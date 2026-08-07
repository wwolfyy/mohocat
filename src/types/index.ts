/** Which side of the avatar a pin's title label sits on. */
export type LabelSide = 'above' | 'below';

export interface Point {
  id: string;
  /** Owning mountain (multi-mountain plan §2.3). Optional until the M4 backfill
   *  stamps every existing doc; M5 tightens reads/rules around it. */
  mountainId?: string;
  x: number;
  y: number;
  title: string;
  description?: string;
  /**
   * Per-device override for the title label's side relative to the avatar. The
   * mobile map is rotated 90°, so label collisions differ from desktop — set only
   * the layout you need; an unset side falls back to the automatic edge-flip.
   * Authored directly on the Firestore Point doc (the `points` collection has no
   * CMS UI: edit via the Firestore console or a migration script).
   */
  labelSide?: { mobile?: LabelSide; desktop?: LabelSide };
}

export interface Cat {
  id: string;
  /** Owning mountain — see `Point.mountainId`. */
  mountainId?: string;
  name: string;
  alt_name?: string;
  description?: string;
  thumbnailUrl: string;
  dwelling?: string;
  prev_dwelling?: string;
  date_of_birth?: number;
  dob_certainty?: string;
  sex?: string;
  status?: string;
  character?: string;
  sickness?: string;
  parents?: string;
  offspring?: string;
  isNeutered?: boolean;
  note?: string;
  adoptable?: boolean;
  adoption_info?: string;
  name_origin?: string;
}

// 동참(contact) form submission
export interface Contact {
  id: string;
  /** Owning mountain — see `Point.mountainId`. */
  mountainId?: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  // Firestore Timestamp; kept loosely-typed to avoid a firebase import in the shared types module.
  createdAt?: { seconds: number; nanoseconds: number } | Date;
  /**
   * Whether the admin notification email actually sent. Written by `/api/contact`:
   * `false` on create, promoted to `true` only after the send succeeds.
   *
   * ⚠️ **`undefined` is "unknown", not "failed".** Contacts recorded before this field
   * existed carry no value, and rendering those as failures would be a fabrication.
   */
  notified?: boolean;
}

// Post and Reply interfaces
export interface Post {
  id: string;
  /** Owning mountain — see `Point.mountainId`. */
  mountainId?: string;
  title: string;
  message: string;
  thumbnailUrl?: string;
  mediaType?: 'video' | 'image';
  videoUrls?: string[];
  videoUrl?: string; // Keep for backward compatibility
  imageUrls?: string[];
  /** Author's email — **display only**. See `authorUid` for authorization. */
  username: string;
  /**
   * Author's Firebase Auth uid, stamped once at creation (2026-08-02).
   *
   * 🔑 **This is the field the Firestore rules authorize an author-edit against.**
   * `username` is an email, i.e. mutable and display-shaped; keying "may this
   * person edit this post" on it would tie authorization to a field the UI
   * treats as a label.
   *
   * ⚠️ Optional because posts created before this existed have none. Those fall
   * back to a `username == request.auth.token.email` comparison in the rules —
   * and the legacy `admin@mtcat.com` posts, which match no account at all, stay
   * editable by admins only.
   */
  authorUid?: string;
  date: string;
  time: string;

  // Reply functionality
  parentId?: string; // null for root posts, postId for replies
  replyCount?: number; // cached count for performance
  depth?: number; // 0 for root, 1+ for replies
  threadId?: string; // root post ID for entire thread
  isReply?: boolean; // true for replies, false/undefined for root posts
}
