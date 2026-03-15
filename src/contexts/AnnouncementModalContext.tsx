'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAnnouncementService } from '@/services';
import AnnouncementModal from '@/components/AnnouncementModal';

interface AnnouncementModalContextType {
  showModal: (announcement: any) => void;
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
  const [hasCheckedOnLoad, setHasCheckedOnLoad] = useState(false);

  const announcementService = getAnnouncementService();

  // Check for modal announcement on initial load
  useEffect(() => {
    const checkForModalAnnouncement = async () => {
      if (hasCheckedOnLoad) return;

      try {
        // Check if user has already seen the modal in this session
        const hasSeenModal = sessionStorage.getItem('hasSeenAnnouncementModal');

        if (hasSeenModal) {
          setHasCheckedOnLoad(true);
          return;
        }

        const modalAnnouncement = await (announcementService as any).getModalAnnouncement();

        if (modalAnnouncement) {
          setCurrentAnnouncement(modalAnnouncement);
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
  }, [announcementService, hasCheckedOnLoad]);

  const showModal = (announcement: any) => {
    setCurrentAnnouncement(announcement);
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
      <AnnouncementModal
        announcement={currentAnnouncement}
        isOpen={isModalOpen}
        onClose={hideModal}
      />
    </AnnouncementModalContext.Provider>
  );
};
