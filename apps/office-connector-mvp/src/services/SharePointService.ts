/**
 * SharePoint Service - Stub
 */

export interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
}

export class SharePointService {
  async getSites(): Promise<SharePointSite[]> {
    return [];
  }
}

export default new SharePointService();
