export type PortalConfig = {
clients: string[];
campaigns: string[];
publications: string[];
driveSettings?: {
  rootFolderId?: string;
  rootFolderName?: string;
  isConfigured?: boolean;
  parentFolderUrl?: string; // Google Drive folder URL for custom parent folder
};
};