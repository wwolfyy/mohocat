'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAnnouncementService, getAdoptionService } from '@/services';
import PostModal, { type PostModalKind } from '@/components/PostModal';
import { useMountain } from '@/components/MountainProvider';

/**
 * The site-visit popup. Since 2026-07-31 it serves **both** 공지사항 and 입양홍보,
 * either of which can be flagged with `showInModal` in the CMS.
 *
 * 🔑 **At most one popup per visit, most recently updated wins.** That is the
 * existing behaviour extended, not a new rule: the announcement service already
 * picked the most recent when several were flagged, and the session flag already
 * capped it at one. Two popups stacking on one visit would be a different (and
 * more intrusive) product decision.
 */

interface AnnouncementModalContextType {
  showModal: (announcement: any, kind?: PostModalKind) => void;
  hideModal: () => void;
  isModalOpen: boolean;
  currentAnnouncement: any | null;
}

const AnnouncementModalContext = createContext<AnnouncementModalContextType | undefined>(undefined);

export const useAnnouncementModal = () => {
  const context = useContext(AnnouncementModalContext);
  if (!context) {
    throw new Error('useAnnouncementModal must be used within an AnnouncementModalProvider');
  }
  return context;
};

interface AnnouncementModalProviderProps {
  children: React.ReactNode;
}

export const AnnouncementModalProvider: React.FC<AnnouncementModalProviderProps> = ({
  children,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<any | null>(null);
  const [currentKind, setCurrentKind] = useState<PostModalKind>('announcement');
  const [hasCheckedOnLoad, setHasCheckedOnLoad] = useState(false);

  const mountainId = useMountain();
  const announcementService = getAnnouncementService(mountainId);
  const adoptionService = getAdoptionService(mountainId);

  // Check for modal announcement on initial load
  useEffect(() => {
    const checkForModalAnnouncement = async () => {
      if (hasCheckedOnLoad) return;

      try {
        // Check if user has already seen a popup in this session. The key still
        // says "Announcement" so that sessions already in flight when 입양홍보
        // popups shipped are not shown a second one; it gates both kinds.
        const hasSeenModal = sessionStorage.getItem('hasSeenAnnouncementModal');

        if (hasSeenModal) {
          setHasCheckedOnLoad(true);
          return;
        }

        // Ask both in parallel — one popup shows, so a sequential pair would just
        // be slower. Each service already swallows its own failure to null, so a
        // missing index on one kind cannot suppress the other.
        const [modalAnnouncement, modalAdoption] = await Promise.all([
          (announcementService as any).getModalAnnouncement(),
          (adoptionService as any).getModalPost(),
        ]);

        const timeOf = (post: any) =>
          (post?.updatedAt ?? post?.createdAt ?? new Date(0)).getTime?.() ?? 0;

        // Most recently updated wins when both kinds are flagged.
        const winner =
          modalAnnouncement && modalAdoption
            ? timeOf(modalAdoption) > timeOf(modalAnnouncement)
              ? { post: modalAdoption, kind: 'adoption' as const }
              : { post: modalAnnouncement, kind: 'announcement' as const }
            : modalAdoption
              ? { post: modalAdoption, kind: 'adoption' as const }
              : modalAnnouncement
                ? { post: modalAnnouncement, kind: 'announcement' as const }
                : null;

        if (winner) {
          setCurrentAnnouncement(winner.post);
          setCurrentKind(winner.kind);
          setIsModalOpen(true);
          // Mark that user has seen the modal in this session
          sessionStorage.setItem('hasSeenAnnouncementModal', 'true');
        }
      } catch (error) {
        console.error('Error checking for modal announcement:', error);
      } finally {
        setHasCheckedOnLoad(true);
      }
    };

    // Delay the check slightly to ensure the page has loaded
    const timer = setTimeout(checkForModalAnnouncement, 1000);
    return () => clearTimeout(timer);
  }, [announcementService, adoptionService, hasCheckedOnLoad]);

  const showModal = (announcement: any, kind: PostModalKind = 'announcement') => {
    setCurrentAnnouncement(announcement);
    setCurrentKind(kind);
    setIsModalOpen(true);
  };

  const hideModal = () => {
    setIsModalOpen(false);
    setCurrentAnnouncement(null);
  };

  const value = {
    showModal,
    hideModal,
    isModalOpen,
    currentAnnouncement,
  };

  return (
    <AnnouncementModalContext.Provider value={value}>
      {children}
      <PostModal
        post={currentAnnouncement}
        kind={currentKind}
        isOpen={isModalOpen}
        onClose={hideModal}
      />
    </AnnouncementModalContext.Provider>
  );
};
