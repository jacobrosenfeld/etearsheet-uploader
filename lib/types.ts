export type PortalConfig = {
clients: string[];
campaigns: string[];
publications: string[];
driveSettings?: {
  rootFolderId?: string;
  rootFolderName?: string;
  isConfigured?: boolean;
};
};