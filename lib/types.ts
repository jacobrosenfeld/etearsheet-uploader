export type PortalConfig = {
  clients: Array<{ name: string; hidden?: boolean }>;
  campaigns: Array<{ name: string; hidden?: boolean }>;
  publications: Array<{ name: string; hidden?: boolean }>;
  driveSettings?: {
    rootFolderId?: string;
    rootFolderName?: string;
    isConfigured?: boolean;
    parentFolderUrl?: string; // Google Drive folder URL for custom parent folder
  };
  adminNotifications?: AdminNotification[];
};

export type AdminNotification = {
  id: string;
  version: string;
  title: string;
  message: string;
  type: 'feature' | 'update' | 'announcement';
  createdAt: string;
  dismissedBy?: string[]; // Array of admin session identifiers who dismissed this
};