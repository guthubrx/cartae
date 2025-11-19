/**
 * Types auth pour TeamsService
 */

export interface IAuthService {
  getToken(service: 'owa' | 'graph' | 'sharepoint' | 'teams'): Promise<string>;
}
